(define-constant err-unauthorised (err u4000))
(define-constant err-withdrawal-not-found (err u4001))
(define-constant err-invalid-fee (err u4002))

(define-constant ONE_8 u100000000)

(define-data-var contract-owner principal tx-sender)
(define-map approved-operators principal bool)

;; OWNER DATA
;; 8 decimals commission
(define-data-var commission uint u0)

;; PROGRAM DATA
(define-data-var commission-total uint u0)
(define-data-var total-btc uint u0)
(define-data-var withdrawal-nonce uint u0)
(define-map withdrawals uint {
  btc-amount: uint,
  btcz-amount: uint,
  peg-out-address: (buff 128),
  requested-by: principal,
  fee: uint,
  gas-fee: uint,
	revoked: bool,
	finalized: bool,
	requested-at: uint,
	requested-at-burn-height: uint
})

(define-read-only (get-total-btc)
	(var-get total-btc))

(define-read-only (get-withdrawal-nonce)
	(var-get withdrawal-nonce))

(define-read-only (get-withdrawal-or-fail (withdrawal-id uint))
	(ok (unwrap! (map-get? withdrawals withdrawal-id) err-withdrawal-not-found)))

(define-read-only (is-contract-owner)
	(ok (asserts! (is-eq (var-get contract-owner) tx-sender) err-unauthorised)))
(define-read-only (get-approved-operator-or-default (operator principal))
	(default-to false (map-get? approved-operators operator)))
(define-read-only (is-approved-operator)
	(ok (asserts! (or (get-approved-operator-or-default contract-caller) (is-ok (is-contract-owner))) err-unauthorised)))


(define-public (set-contract-owner (new-contract-owner principal))
	(begin
		(try! (is-contract-owner))
		(ok (var-set contract-owner new-contract-owner))))

(define-public (approve-operator (operator principal) (approved bool))
	(begin
		(try! (is-contract-owner))
		(ok (map-set approved-operators operator approved))))


(define-public (set-total-btc (new-total-btc uint))
	(begin
		(try! (is-approved-operator))
		(ok (var-set total-btc new-total-btc))))
(define-public (set-withdrawal-nonce (new-withdrawal-nonce uint))
	(begin
		(try! (is-approved-operator))
		(ok (var-set withdrawal-nonce new-withdrawal-nonce))))

(define-public (set-withdrawal
  (withdrawal-id uint)
  (new-withdrawal {
    btc-amount: uint,
    btcz-amount: uint,
    peg-out-address: (buff 128),
    requested-by: principal,
    fee: uint,
    gas-fee: uint,
    revoked: bool,
    finalized: bool,
    requested-at: uint,
    requested-at-burn-height: uint }))
	(begin
		(try! (is-approved-operator))
		(ok (map-set withdrawals withdrawal-id new-withdrawal))))

(define-public (delete-withdrawal (withdrawal-id uint))
	(begin
		(try! (is-approved-operator))
		(ok (map-delete withdrawals withdrawal-id))))
