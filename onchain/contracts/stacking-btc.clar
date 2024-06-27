
(define-data-var total-btc uint u0)
(define-data-var withdraw-id uint u0)
(define-map withdrawal-by-id uint { btc-amount: uint, sbtc-amount: uint, cycle-id: uint, peg-out-address: (buff 128) })

(define-public (deposit
  (tx (buff 4096))
	(block { header: (buff 80), height: uint })
	(proof { tx-index: uint, hashes: (list 14 (buff 32)), tree-depth: uint })
	(output-idx uint)
  (order-idx uint)
  )
  (let (
    ;; (peg-in-data { fee: u100, amount-net: u10000 })
    (btc-to-sbtc-ratio (get-btc-to-sbtc-ratio))
    (peg-in-data (try! (contract-call? .bridge-endpoint finalize-peg-in-0 tx block proof output-idx order-idx)))
    (redeemeable-btc (/ (* (get amount-net peg-in-data) btc-to-sbtc-ratio) u100000000))
  )
    (var-set total-btc (+ (var-get total-btc) (get amount-net peg-in-data)))
    (ok true)
  )
)

(define-public (init-withdraw
  (peg-out-address (buff 128))
  (sbtc-amount uint)
  )
  (let (
    (btc-to-sbtc-ratio (get-btc-to-sbtc-ratio))
    (redeemeable-btc (/ (* sbtc-amount btc-to-sbtc-ratio) u100000000))
    (current-id (var-get withdraw-id))
  )
    (try! (contract-call? .token-abtc transfer sbtc-amount tx-sender (as-contract tx-sender) none))
    (map-set withdrawal-by-id current-id { btc-amount: redeemeable-btc, sbtc-amount: sbtc-amount, cycle-id: u0, peg-out-address: peg-out-address })

    (var-set withdraw-id (+ current-id u1))
    (ok true)
  )
)

(define-constant err-withdrawal-does-not-exist (err u500))

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
  )
    (as-contract (try! (contract-call? .token-abtc burn (get sbtc-amount withdraw-data) tx-sender)))
    (var-set total-btc (- (var-get total-btc) (get btc-amount withdraw-data)))
    (map-delete withdrawal-by-id request-id)
    ;; (try! (contract-call? .bridge-endpoint finalize-peg-out request-id tx block proof output-idx fulfilled-by-idx))
    (ok true)
  )
)

(define-public (add-rewards (btc-amount uint))
  (begin
    (var-set total-btc (+ (var-get total-btc) btc-amount))
    (ok true)
  )
)

(define-read-only (get-btc-to-sbtc-ratio)
  (let (
    (btc-amount (var-get total-btc))
    (sbtc-supply (unwrap-panic (contract-call? .token-abtc get-total-supply)))
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
  (/ (* (unwrap-panic (contract-call? .token-abtc get-balance user)) (get-btc-to-sbtc-ratio)) u100000000)
)

(define-read-only (get-total-btc)
  (var-get total-btc)
)

(define-read-only (get-withdrawal-by-id (id uint))
  (map-get? withdrawal-by-id id)
)
