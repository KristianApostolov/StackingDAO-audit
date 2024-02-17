;; @contract Stacking Delegate
;; @version 1

(impl-trait .stacking-delegate-trait-v1.stacking-delegate-trait)
(use-trait reserve-trait .reserve-trait-v1.reserve-trait)
(use-trait rewards-trait .rewards-trait-v1.rewards-trait)

;;-------------------------------------
;; Pox Wrappers 
;;-------------------------------------

(define-public (delegate-stx (amount-ustx uint) (delegate-to principal) (until-burn-ht (optional uint)))
  (begin
    (try! (contract-call? .dao check-is-protocol contract-caller))
    (print { action: "delegate-stx", data: { amount: amount-ustx, delegate-to: delegate-to, until-burn-ht: until-burn-ht, block-height: block-height } })

    ;; TODO: update for mainnet
    (match (as-contract (contract-call? .pox-4-mock delegate-stx amount-ustx delegate-to until-burn-ht none))
      result (ok result)
      error (err (to-uint error))
    )
  )
)

(define-public (revoke-delegate-stx)
  (begin
    (try! (contract-call? .dao check-is-protocol contract-caller))
    (print { action: "revoke-delegate-stx", data: { block-height: block-height } })

    ;; TODO: update for mainnet
    (match (as-contract (contract-call? .pox-4-mock revoke-delegate-stx))
      result (ok result)
      error (err (to-uint error))
    )
  )
)

;;-------------------------------------
;; Reserve 
;;-------------------------------------

(define-public (request-stx-to-stack (reserve <reserve-trait>) (amount uint))
  (begin
    (try! (contract-call? .dao check-is-protocol contract-caller))
    (try! (contract-call? .dao check-is-protocol (contract-of reserve)))

    (print { action: "request-stx-to-stack", data: { amount: amount, block-height: block-height } })
    (as-contract (contract-call? reserve request-stx-to-stack amount))
  )
)

(define-public (return-stx-from-stacking (reserve <reserve-trait>) (amount uint))
  (begin
    (try! (contract-call? .dao check-is-protocol contract-caller))
    (try! (contract-call? .dao check-is-protocol (contract-of reserve)))

    (print { action: "return-stx-from-stacking", data: { amount: amount, block-height: block-height } })
    (as-contract (contract-call? reserve return-stx-from-stacking amount))
  )
)

;;-------------------------------------
;; Rewards 
;;-------------------------------------

(define-public (handle-rewards (pool principal) (rewards uint) (rewards-contract <rewards-trait>))
  (begin
    (try! (contract-call? .dao check-is-protocol contract-caller))
    (try! (contract-call? .dao check-is-protocol (contract-of rewards-contract)))

    (if (> rewards u0)
      (try! (as-contract (contract-call? rewards-contract add-rewards pool rewards)))
      true
    )

    (print { action: "handle-rewards", data: { pool: pool, rewards: rewards, block-height: block-height } })
    (ok rewards)
  )
)

;;-------------------------------------
;; PoX Helpers 
;;-------------------------------------

(define-read-only (get-stx-account (account principal))
  ;; TODO: update for mainnet
  (contract-call? .pox-4-mock stx-account-mock account)
  ;; (stx-account account)
)

;;-------------------------------------
;; Admin
;;-------------------------------------

;; Return all STX to the reserve
(define-public (return-stx (reserve <reserve-trait>))
  (let (
    (return-amount (get unlocked (get-stx-account (as-contract tx-sender))))
  )
    (try! (contract-call? .dao check-is-protocol contract-caller))
    (try! (contract-call? .dao check-is-protocol (contract-of reserve)))

    (if (> return-amount u0)
      (try! (as-contract (contract-call? reserve return-stx-from-stacking return-amount)))
      u0
    )
    (ok return-amount)
  )
)
