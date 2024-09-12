(define-constant err-unauthorised (err u3000))
(define-constant err-invalid-fee (err u3001))

(define-constant ONE_8 u100000000)

(define-data-var contract-owner principal tx-sender)
(define-data-var peg-in-paused bool true)
(define-data-var peg-out-paused bool true)
;; 8 decimals
(define-data-var peg-in-fee uint u0)
(define-data-var peg-out-fee uint u0)
(define-data-var peg-out-gas-fee uint u0)

(define-read-only (is-peg-in-paused)
	(var-get peg-in-paused))
(define-read-only (is-peg-out-paused)
	(var-get peg-out-paused))
(define-read-only (get-peg-in-fee)
	(var-get peg-in-fee))
(define-read-only (get-peg-out-fee)
	(var-get peg-out-fee))
(define-read-only (get-peg-out-gas-fee)
	(var-get peg-out-gas-fee))

(define-read-only (is-contract-owner)
	(ok (asserts! (is-eq (var-get contract-owner) tx-sender) err-unauthorised)))

(define-public (set-contract-owner (new-contract-owner principal))
	(begin
		(try! (is-contract-owner))
		(ok (var-set contract-owner new-contract-owner))))

(define-public (pause-peg-in (paused bool))
	(begin
		(try! (is-contract-owner))
		(ok (var-set peg-in-paused paused))))
(define-public (pause-peg-out (paused bool))
	(begin
		(try! (is-contract-owner))
		(ok (var-set peg-out-paused paused))))
(define-public (set-peg-in-fee (fee uint))
	(begin
		(try! (is-contract-owner))
    (asserts! (< fee ONE_8) err-invalid-fee)
		(ok (var-set peg-in-fee fee))))
(define-public (set-peg-out-fee (fee uint))
	(begin
		(try! (is-contract-owner))
    (asserts! (< fee ONE_8) err-invalid-fee)
		(ok (var-set peg-out-fee fee))))
(define-public (set-peg-out-gas-fee (fee uint))
	(begin
		(try! (is-contract-owner))
		(ok (var-set peg-out-gas-fee fee))))