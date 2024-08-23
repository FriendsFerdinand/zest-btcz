
(define-data-var total-btc uint u0)
(define-data-var withdraw-id uint u0)
(define-data-var commission uint u0)

(define-data-var peg-in-fee uint u0)
(define-data-var peg-out-fee uint u0)
(define-data-var peg-out-gas-fee uint u0)

(define-constant err-withdrawal-does-not-exist (err u500))

(define-map withdrawal-by-id uint {
  btc-amount: uint,
  sbtc-amount: uint,
  cycle-id: uint,
  peg-out-address: (buff 128),
  requested-by: principal,
  fee: uint,
  gas-fee: uint
})

(define-data-var request-nonce uint u0)





(define-public (deposit
  (tx (buff 4096))
	(block { header: (buff 80), height: uint })
	(proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint })
	(output-idx uint)
  (order-idx uint)
  )
  (let (
    (btc-to-sbtc-ratio (get-btc-to-sbtc-ratio))
    (peg-in-data (try! (contract-call? .bridge-endpoint finalize-peg-in-0 tx block proof output-idx order-idx)))
    (sbtc-to-receive (/ (* (get amount-net peg-in-data) u100000000) btc-to-sbtc-ratio))
    (fee-bps (contract-call? .bridge-endpoint get-peg-in-fee))
    (sender (get recipient peg-in-data))
    (fee (/ (* fee-bps sbtc-to-receive) u10000))
  )
    (var-set total-btc (+ (var-get total-btc) (get amount-net peg-in-data)))

    (and (> fee u0) (as-contract (try! (contract-call? .token-btc mint fee sender))))
    (as-contract (try! (contract-call? .token-btc mint sbtc-to-receive sender)))
    (ok sbtc-to-receive)
  )
)

(define-public (init-withdraw
  (peg-out-address (buff 128))
  (sbtc-amount uint)
  )
  (let (
    (sender tx-sender)
    (btc-to-sbtc-ratio (get-btc-to-sbtc-ratio))
    (redeemeable-btc (/ (* sbtc-amount btc-to-sbtc-ratio) u100000000))
    (current-id (var-get withdraw-id))
    (current-cycle (get-current-cycle))
  )
    (try! (contract-call? .bridge-endpoint request-peg-out-0 peg-out-address redeemeable-btc))
    (try! (contract-call? .token-btc transfer sbtc-amount sender (as-contract tx-sender) none))

    (map-set withdrawal-by-id (begin (var-set request-nonce (+ (var-get request-nonce) u1)) (var-get request-nonce)) {
      btc-amount: redeemeable-btc,
      sbtc-amount: sbtc-amount,
      cycle-id: current-cycle,
      peg-out-address: peg-out-address,
      requested-by: sender,
      fee: u0,
      gas-fee: u0,
    })

    (var-set withdraw-id (+ current-id u1))
    (ok redeemeable-btc)
  )
)

;; called by user claiming fees
(define-public (withdraw
  (request-id uint)
	(tx (buff 4096))
	(block { header: (buff 80), height: uint })
	(proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint })
	(output-idx uint)
  (fulfilled-by-idx uint)
  )
  (let (
    (withdraw-data (unwrap! (map-get? withdrawal-by-id request-id) err-withdrawal-does-not-exist))
    (current-cycle (get-current-cycle))
  )
    ;; (try! (contract-call? .bridge-endpoint finalize-peg-out request-id tx block proof output-idx fulfilled-by-idx))
    (as-contract (try! (contract-call? .token-btc burn (get sbtc-amount withdraw-data) tx-sender)))
    (var-set total-btc (- (var-get total-btc) (get btc-amount withdraw-data)))
    (map-delete withdrawal-by-id request-id)
    (print { action: "withdraw", data: { sender: tx-sender, amount: (get sbtc-amount withdraw-data), block-height: burn-block-height } })
    (ok true)
  )
)

(define-data-var commission-total uint u0)

(define-public (add-rewards (btc-amount uint))
  (let (
    (commission-amount (/ (* btc-amount (var-get commission)) u10000))
    (rewards (- btc-amount commission-amount))
    (rewards-left (- rewards commission-amount))
  )
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u2312412))
    
    (and (> commission-amount u0) (var-set commission-total (+ commission-amount (var-get commission-total))))
    (var-set total-btc (+ (var-get total-btc) rewards))
    (ok true)
  )
)

(define-public (claim-commission)
  (let (
    (rewards (var-get commission-total))
  )
    (begin
      (asserts! (is-eq tx-sender (var-get contract-owner)) (err u2312412))
      (var-set commission-total u0)
      (ok true)
    )
  )
)

(define-read-only (get-btc-to-sbtc-ratio)
  (let (
    (btc-amount (var-get total-btc))
    (sbtc-supply (unwrap-panic (contract-call? .token-btc get-total-supply)))
  )
    (if (is-eq sbtc-supply u0)
      u100000000
      (/ (* btc-amount u100000000) sbtc-supply)
    )
  )
)

(define-read-only (get-redeemable-btc-by-amount (btc-amount uint))
  (/ (* btc-amount (get-btc-to-sbtc-ratio)) u100000000)
)

(define-read-only (get-redeemable-btc (user principal))
  (/ (* (unwrap-panic (contract-call? .token-btc get-balance user)) (get-btc-to-sbtc-ratio)) u100000000)
)

(define-read-only (get-total-btc)
  (var-get total-btc)
)

(define-read-only (get-withdrawal-by-id (id uint))
  (map-get? withdrawal-by-id id)
)

;; Cycle logic
(define-data-var start-block uint u1)
(define-data-var cycle-length uint u99999999999999999999)

(define-data-var contract-owner principal tx-sender)

(define-public (init)
  (begin
    (asserts! (is-eq (var-get contract-owner) tx-sender) (err u9425))
    (ok (var-set start-block burn-block-height))
  )
)

(define-public (set-cycle-length (new-cycle-length uint))
  (ok (var-set cycle-length new-cycle-length))
)

;; get the reward cycle for a given Stacks block height
(define-read-only (get-current-cycle)
  (let (
    (first-block (var-get start-block))
    (c-len (var-get cycle-length)))
    (/ (- burn-block-height first-block) c-len)
  )
)
