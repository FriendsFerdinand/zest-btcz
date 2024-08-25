(define-constant err-unauthorised (err u1000))
(define-constant err-withdrawal-not-found (err u1002))

(define-data-var contract-owner principal tx-sender)
(define-map approved-operators principal bool)

;; owner data
(define-data-var commission uint u0)

;; program data
(define-data-var withdraw-id uint u0)
(define-data-var commission-total uint u0)
(define-data-var total-btc uint u0)
(define-data-var request-nonce uint u0)
(define-map withdrawals uint {
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

(define-public (set-contract-owner (new-contract-owner principal))
	(begin
		(try! (is-contract-owner))
		(ok (var-set contract-owner new-contract-owner))))
(define-public (set-commission (new-commission uint))
	(begin
		(try! (is-contract-owner))
		(ok (var-set commission new-commission))))

(define-public (set-withdraw-id (new-withdraw-id uint))
	(begin
		(try! (is-approved-operator))
		(ok (var-set withdraw-id new-withdraw-id))))
(define-public (set-commission-total (new-commission-total uint))
	(begin
		(try! (is-approved-operator))
		(ok (var-set commission-total new-commission-total))))
(define-public (set-total-btc (new-total-btc uint))
	(begin
		(try! (is-approved-operator))
		(ok (var-set total-btc new-total-btc))))
(define-public (set-request-nonce (new-request-nonce uint))
	(begin
		(try! (is-approved-operator))
		(ok (var-set request-nonce new-request-nonce))))
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
	(begin
		(try! (is-approved-operator))
		(ok (map-set withdrawals withdrawal-id new-withdrawal))))
(define-public (delete-withdrawal (withdrawal-id uint))
	(begin
		(try! (is-approved-operator))
		(ok (map-delete withdrawals withdrawal-id))))

(define-public (approve-operator (operator principal) (approved bool))
	(begin
		(try! (is-contract-owner))
		(ok (map-set approved-operators operator approved))))

(define-read-only (get-total-btc)
	(var-get total-btc))
(define-read-only (get-withdraw-id)
	(var-get withdraw-id))
(define-read-only (get-commission)
	(var-get commission))
(define-read-only (get-commission-total)
	(var-get commission-total))
(define-read-only (get-request-nonce)
	(var-get request-nonce))

(define-read-only (get-withdrawal-or-fail (request-id uint))
	(ok (unwrap! (map-get? withdrawals request-id) err-withdrawal-not-found)))

(define-private (is-contract-owner)
	(ok (asserts! (is-eq (var-get contract-owner) tx-sender) err-unauthorised)))
(define-read-only (get-approved-operator-or-default (operator principal))
	(default-to false (map-get? approved-operators operator)))
(define-read-only (is-approved-operator)
	(ok (asserts! (or (get-approved-operator-or-default contract-caller) (is-ok (is-contract-owner))) err-unauthorised)))
