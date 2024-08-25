(use-trait ft-trait .ft-trait.ft-trait)

(define-public (transfer (amount uint) (recipient principal) (f-t <ft-trait>))
  (begin
    (try! (is-approved-contract contract-caller))
    (try! (as-contract (contract-call? f-t transfer amount tx-sender recipient none)))
    (print { type: "transfer-pool-vault", payload: { amount: amount, recipient: recipient, asset: f-t } })
    (ok true)
  )
)

(define-public (burn (amount uint) (f-t <ft-trait>))
  (begin
    (try! (is-approved-contract contract-caller))
    (try! (as-contract (contract-call? f-t burn amount tx-sender)))
    (print { type: "transfer-pool-vault", payload: { amount: amount, asset: f-t } })
    (ok true)
  )
)

;; -- ownable-trait --
(define-data-var contract-owner principal tx-sender)

(define-public (get-contract-owner)
  (ok (var-get contract-owner)))

(define-public (set-contract-owner (owner principal))
  (begin
    (asserts! (is-contract-owner tx-sender) ERR_UNAUTHORIZED)
    (print { type: "set-contract-owner-pool-vault", payload: owner })
    (ok (var-set contract-owner owner))))

(define-read-only (is-contract-owner (caller principal))
  (is-eq caller (var-get contract-owner)))

(define-map approved-contracts principal bool)

(define-read-only (is-approved-contract (contract principal))
  (if (default-to false (map-get? approved-contracts contract))
    (ok true)
    ERR_UNAUTHORIZED))

(define-public (set-approved-contract (contract principal) (approved bool))
  (begin
		(asserts! (is-contract-owner tx-sender) ERR_UNAUTHORIZED)
		(ok (map-set approved-contracts contract approved))
  )
)

;; ERROR START 7000
(define-constant ERR_UNAUTHORIZED (err u7000))