(define-constant err-unauthorised (err u2000))

(define-data-var contract-owner principal tx-sender)
(define-map approved-operators principal bool)
(define-map approved-peg-in-address (buff 128) bool)
(define-map peg-in-sent { tx: (buff 4096), output: uint } bool)

;; peg-in data
(define-read-only (is-peg-in-address-approved (address (buff 128)))
	(default-to false (map-get? approved-peg-in-address address)))
(define-read-only (get-peg-in-sent-or-default (tx (buff 4096)) (output uint))
	(default-to false (map-get? peg-in-sent { tx: tx, output: output })))

;; permission data
(define-read-only (get-approved-operator-or-default (operator principal))
	(default-to false (map-get? approved-operators operator)))
(define-read-only (is-contract-owner)
	(ok (asserts! (is-eq (var-get contract-owner) tx-sender) err-unauthorised)))

(define-read-only (is-approved-operator)
	(ok (asserts! (or (get-approved-operator-or-default contract-caller) (is-ok (is-contract-owner))) err-unauthorised)))

(define-public (approve-operator (operator principal) (approved bool))
	(begin
		(try! (is-contract-owner))
		(ok (map-set approved-operators operator approved))))
(define-public (set-contract-owner (new-contract-owner principal))
	(begin
		(try! (is-contract-owner))
		(ok (var-set contract-owner new-contract-owner))))
(define-public (approve-peg-in-address (address (buff 128)) (approved bool))
	(begin
		(try! (is-contract-owner))
		(ok (map-set approved-peg-in-address address approved))))

(define-public (set-peg-in-sent (tx (buff 4096)) (output uint) (sent bool))
	(begin
		(try! (is-approved-operator))
		(ok (map-set peg-in-sent { tx: tx, output: output } sent))))
