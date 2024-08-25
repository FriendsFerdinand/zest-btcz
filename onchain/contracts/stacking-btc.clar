(define-constant err-unauthorised (err u1000))
(define-constant err-paused (err u1001))
(define-constant err-peg-in-address-not-found (err u1002))
(define-constant err-invalid-amount (err u1003))
(define-constant err-invalid-tx (err u1004))
(define-constant err-already-sent (err u1005))
(define-constant err-address-mismatch (err u1006))
;; (define-constant err-request-already-revoked (err u1007))
;; (define-constant err-request-already-finalized (err u1008))
;; (define-constant err-revoke-grace-period (err u1009))
;; (define-constant err-request-already-claimed (err u1010))
(define-constant err-bitcoin-tx-not-mined (err u1011))
(define-constant err-invalid-input (err u1012))
(define-constant err-tx-mined-before-request (err u1013))
;; (define-constant err-dest-mismatch (err u1014))
;; (define-constant err-token-mismatch (err u1015))
;; (define-constant err-slippage (err u1016))
(define-constant err-withdrawal-does-not-exist (err u1017))

(define-constant ONE_8 u100000000)

;; bitcoin verification
(define-data-var contract-owner principal tx-sender)

(define-map withdrawal-by-id uint {
  btc-amount: uint,
  sbtc-amount: uint,
  peg-out-address: (buff 128),
  requested-by: principal,
  fee: uint,
  gas-fee: uint,
	revoked: bool,
	finalized: bool,
	requested-at: uint,
	requested-at-burn-height: uint
})

(define-public (deposit
  (tx (buff 4096))
	(block { header: (buff 80), height: uint })
	(proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint })
	(output-idx uint)
  (order-idx uint)
  )
  (let (
    (common-check (try! (verify-mined tx block proof)))
    (parsed-tx (try! (extract-tx-ins-outs tx)))
    (output (unwrap! (element-at (get outs parsed-tx) output-idx) err-invalid-tx))
    (amount (get value output))
    (peg-in-address (get scriptPubKey output))
    (order-script (get scriptPubKey (unwrap-panic (element-at? (get outs parsed-tx) order-idx))))
    (fee (mul-down amount (get-peg-in-fee)))
    (amount-net (- amount fee))
    (recipient (try! (decode-order-0-or-fail order-script)))

    (btc-to-sbtc-ratio (get-btc-to-sbtc-ratio))
    (sbtc-to-receive (div-down amount-net btc-to-sbtc-ratio))
    (sender recipient)
  )
		(asserts! (not (is-peg-in-paused)) err-paused)
    (asserts! (not (get-peg-in-sent-or-default tx output-idx)) err-already-sent)
    (asserts! (is-peg-in-address-approved peg-in-address) err-peg-in-address-not-found)
    (asserts! (> amount-net u0) err-invalid-amount)

    (try! (set-total-btc (+ (get-total-btc) amount-net)))

		(try! (contract-call? .btc-bridge-registry-v1-01 set-peg-in-sent tx output-idx true))
    (try! (contract-call? .token-btc mint sbtc-to-receive sender))

    (ok { fee: fee, amount-net: amount-net, recipient: recipient, sbtc-to-receive: sbtc-to-receive })
  )
)

(define-public (init-withdraw
  (peg-out-address (buff 128))
  (sbtc-amount uint)
  )
  (let (
    (sender tx-sender)
    (btc-to-sbtc-ratio (get-btc-to-sbtc-ratio))
    (redeemeable-btc (mul-down sbtc-amount btc-to-sbtc-ratio))
    (fee (mul-down redeemeable-btc (get-peg-out-fee)))
    (gas-fee (get-peg-out-gas-fee))
    (check-amount (asserts! (> redeemeable-btc (+ fee gas-fee)) err-invalid-amount))
    (amount-net (- redeemeable-btc fee gas-fee))
    (next-nonce (get-next-request-nonce))
  )
		(asserts! (not (is-peg-out-paused)) err-paused)
    (try! (contract-call? .token-btc transfer sbtc-amount sender .stacking-vault none))

    (try! (set-withdrawal next-nonce {
      btc-amount: amount-net,
      sbtc-amount: sbtc-amount,
      peg-out-address: peg-out-address,
      requested-by: sender,
      fee: fee,
      gas-fee: gas-fee,
      revoked: false,
      finalized: false,
      requested-at: block-height,
      requested-at-burn-height: burn-block-height,
    }))
    (try! (set-request-nonce next-nonce))

    (ok amount-net)
  )
)

;; called by protocol
(define-public (finalize-withdraw
  (request-id uint)
	(tx (buff 4096))
	(block { header: (buff 80), height: uint })
	(proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint })
	(output-idx uint)
  (fulfilled-by-idx uint)
  )
  (let (
    (withdraw-data (unwrap! (get-withdrawal-or-fail request-id) err-withdrawal-does-not-exist))
    (withdrawn-btc (+ (get btc-amount withdraw-data) (get fee withdraw-data) (get gas-fee withdraw-data)))
  )
    (try! (is-contract-owner))
    
    (as-contract (try! (contract-call? .stacking-vault burn (get sbtc-amount withdraw-data) .token-btc)))
    (try! (set-total-btc (- (get-total-btc) withdrawn-btc)))
    (try! (delete-withdrawal request-id))
    ;; (print { action: "withdraw", data: { sender: tx-sender, amount: (get sbtc-amount withdraw-data), block-height: burn-block-height } })
    (ok true)
  )
)

(define-public (add-rewards (btc-amount uint))
  (let (
    (commission-amount (mul-down btc-amount (get-commission)))
    (rewards (- btc-amount commission-amount))
    (rewards-left (- rewards commission-amount))
  )
    (try! (is-contract-owner))
    
    (and (> commission-amount u0) (try! (set-commission-total (+ commission-amount (get-commission-total)))))
    (try! (set-total-btc (+ (get-total-btc) rewards)))
    (ok true)
  )
)

(define-public (claim-commission)
  (let ((rewards (get-commission-total)))
    (begin
      (try! (is-contract-owner))
      (try! (set-commission-total u0))
      (ok true)
    )
  )
)

(define-read-only (get-btc-to-sbtc-ratio)
  (let (
    (btc-amount (get-total-btc))
    (sbtc-supply (unwrap-panic (contract-call? .token-btc get-total-supply)))
  )
    (if (is-eq sbtc-supply u0)
      u100000000
      (div-down btc-amount sbtc-supply)
    )
  )
)

(define-read-only (get-next-request-nonce)
  (+ (get-request-nonce) u1))

(define-read-only (get-redeemable-btc-by-amount (btc-amount uint))
  (mul-down btc-amount (get-btc-to-sbtc-ratio)))

(define-read-only (get-redeemable-btc (user principal))
  (mul-down (unwrap-panic (contract-call? .token-btc get-balance user)) (get-btc-to-sbtc-ratio)))

(define-private (is-contract-owner)
	(ok (asserts! (is-eq (var-get contract-owner) tx-sender) err-unauthorised)))

(define-public (set-contract-owner (new-contract-owner principal))
	(begin
		(try! (is-contract-owner))
		(ok (var-set contract-owner new-contract-owner))))

(define-private (mul-down (a uint) (b uint))
	(/ (* a b) ONE_8))
(define-private (div-down (a uint) (b uint))
	(if (is-eq a u0)
		u0
		(/ (* a ONE_8) b)))

;; stacking data
(define-read-only (is-peg-in-paused)
	(contract-call? .btc-data is-peg-in-paused))
(define-read-only (is-peg-out-paused)
	(contract-call? .btc-data is-peg-out-paused))

(define-read-only (get-peg-in-fee)
	(contract-call? .btc-data get-peg-in-fee))
(define-read-only (get-peg-out-fee)
	(contract-call? .btc-data get-peg-out-fee))
(define-read-only (get-peg-out-gas-fee)
	(contract-call? .btc-data get-peg-out-gas-fee))
(define-read-only (get-fee-address)
	(contract-call? .btc-data get-fee-address))

(define-read-only (is-peg-in-address-approved (address (buff 128)))
	(contract-call? .btc-bridge-registry-v1-01 is-peg-in-address-approved address))
(define-read-only (get-peg-in-sent-or-default (tx (buff 4096)) (output uint))
	(contract-call? .btc-bridge-registry-v1-01 get-peg-in-sent-or-default tx output))

(define-read-only (get-withdrawal-or-fail (id uint))
  (contract-call? .stacking-data get-withdrawal-or-fail id))

;; btc data
(define-read-only (get-total-btc)
	(contract-call? .stacking-data get-total-btc))
(define-read-only (get-withdraw-id)
	(contract-call? .stacking-data get-withdraw-id))
(define-read-only (get-commission)
	(contract-call? .stacking-data get-commission))
(define-read-only (get-commission-total)
	(contract-call? .stacking-data get-commission-total))
(define-read-only (get-request-nonce)
	(contract-call? .stacking-data get-request-nonce))

(define-public (set-withdraw-id (withdraw-id uint))
	(contract-call? .stacking-data set-withdraw-id withdraw-id))
(define-public (set-commission-total (commission-total uint))
	(contract-call? .stacking-data set-commission-total commission-total))
(define-public (set-total-btc (total-btc uint))
	(contract-call? .stacking-data set-total-btc total-btc))
(define-public (set-request-nonce (request-nonce uint))
	(contract-call? .stacking-data set-request-nonce request-nonce))

(define-public (set-withdrawal
  (withdrawal-id uint)
  (new-withdrawal {
    btc-amount: uint,
    sbtc-amount: uint,
    peg-out-address: (buff 128),
    requested-by: principal,
    fee: uint,
    gas-fee: uint,
    revoked: bool,
    finalized: bool,
    requested-at: uint,
    requested-at-burn-height: uint
  }))
	(contract-call? .stacking-data set-withdrawal withdrawal-id new-withdrawal)
)

(define-public (delete-withdrawal (withdrawal-id uint))
	(contract-call? .stacking-data delete-withdrawal withdrawal-id))

(define-read-only (extract-tx-ins-outs (tx (buff 4096)))
	(if (try! (contract-call? .clarity-bitcoin-v1-02 is-segwit-tx tx))
		(let (
				(parsed-tx (unwrap! (contract-call? .clarity-bitcoin-v1-02 parse-wtx tx) err-invalid-tx)))
			(ok { ins: (get ins parsed-tx), outs: (get outs parsed-tx) }))
		(let (
				(parsed-tx (unwrap! (contract-call? .clarity-bitcoin-v1-02 parse-tx tx) err-invalid-tx)))
			(ok { ins: (get ins parsed-tx), outs: (get outs parsed-tx) }))
	))

(define-read-only (get-txid (tx (buff 4096)))
	(if (try! (contract-call? .clarity-bitcoin-v1-02 is-segwit-tx tx))
		(ok (contract-call? .clarity-bitcoin-v1-02 get-segwit-txid tx))
		(ok (contract-call? .clarity-bitcoin-v1-02 get-txid tx))
	))

(define-read-only (verify-mined (tx (buff 4096)) (block { header: (buff 80), height: uint }) (proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint }))
	(if (is-eq chain-id u1)
		(let (
				(response (if (try! (contract-call? .clarity-bitcoin-v1-02 is-segwit-tx tx))
					(contract-call? .clarity-bitcoin-v1-02 was-segwit-tx-mined? block tx proof)
					(contract-call? .clarity-bitcoin-v1-02 was-tx-mined? block tx proof))
				))
			(if (or (is-err response) (not (unwrap-panic response)))
				err-bitcoin-tx-not-mined
				(ok true)
			))
		(ok true))) ;; if not mainnet, assume verified

(define-read-only (create-order-0-or-fail (order principal))
	(ok (unwrap! (to-consensus-buff? order) err-invalid-input)))

(define-read-only (decode-order-0-or-fail (order-script (buff 128)))
	(let (
			(op-code (unwrap-panic (slice? order-script u1 u2))))
			(ok (unwrap! (from-consensus-buff? principal (unwrap-panic (slice? order-script (if (< op-code 0x4c) u2 u3) (len order-script)))) err-invalid-input))))