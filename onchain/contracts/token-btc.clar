(define-constant ERR-NOT-AUTHORIZED (err u5000))

(define-constant ONE_8 u100000000)

(impl-trait .ft-trait.ft-trait)
(define-fungible-token token-btcz)
(define-data-var contract-owner principal tx-sender)
(define-map approved-contracts principal bool)
(define-data-var token-name (string-ascii 32) "BTCz")
(define-data-var token-symbol (string-ascii 10) "BTCz")
(define-data-var token-uri (optional (string-utf8 256)) (some u""))
(define-data-var token-decimals uint u8)

;; token data
(define-read-only (get-name)
	(ok (var-get token-name)))
(define-read-only (get-symbol)
	(ok (var-get token-symbol)))
(define-read-only (get-decimals)
	(ok (var-get token-decimals)))
(define-read-only (get-token-uri)
	(ok (var-get token-uri)))

(define-read-only (get-balance (who principal))
	(ok (ft-get-balance token-btcz who)))
(define-read-only (get-total-supply)
	(ok (ft-get-supply token-btcz)))
;; token data setter
(define-public (set-name (new-name (string-ascii 32)))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-name new-name))))
(define-public (set-symbol (new-symbol (string-ascii 10)))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-symbol new-symbol))))
(define-public (set-decimals (new-decimals uint))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-decimals new-decimals))))
(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-uri new-uri))))

;; permission data
(define-read-only (get-contract-owner)
	(ok (var-get contract-owner)))

(define-private (check-is-owner)
	(ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)))
(define-private (check-is-approved)
	(ok (asserts! (default-to false (map-get? approved-contracts contract-caller)) ERR-NOT-AUTHORIZED)))

;; permission data setter
(define-public (set-contract-owner (owner principal))
	(begin
		(try! (check-is-owner))
		(ok (var-set contract-owner owner))))
(define-public (set-approved-contract (owner principal) (approved bool))
	(begin
		(try! (check-is-owner))
		(ok (map-set approved-contracts owner approved))))

;; token actions
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq sender tx-sender) ERR-NOT-AUTHORIZED)
		(try! (ft-transfer? token-btcz amount sender recipient))
		(match memo to-print (print to-print) 0x)
		(ok true)))

(define-public (mint (amount uint) (recipient principal))
	(begin
		(asserts! (is-ok (check-is-approved)) ERR-NOT-AUTHORIZED)
		(ft-mint? token-btcz amount recipient)))

(define-public (burn (amount uint) (sender principal))
	(begin
		(asserts! (is-ok (check-is-approved)) ERR-NOT-AUTHORIZED)
		(ft-burn? token-btcz amount sender)))
