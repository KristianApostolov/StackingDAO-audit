;; @contract Stacking Strategy
;; @version 2
;;

(use-trait stacking-delegate-trait .stacking-delegate-trait-v1.stacking-delegate-trait)
(use-trait reserve-trait .reserve-trait-v1.reserve-trait)

;;-------------------------------------
;; PoX info 
;;-------------------------------------

(define-read-only (get-pox-cycle)
  ;; TODO: update for mainnet
  (contract-call? .pox-3-mock current-pox-reward-cycle)
)

(define-read-only (get-next-cycle-end-burn-height)
  ;; TODO: update for mainnet
  (contract-call? .pox-3-mock reward-cycle-to-burn-height (+ (get-pox-cycle) u2))
)

;;-------------------------------------
;; Inflow/outflow info 
;;-------------------------------------

(define-read-only (get-total-stacking)
  (unwrap-panic (contract-call? .reserve-v1 get-stx-stacking))
)

;; Calculate STX outflow or inflow for next cycle.
(define-read-only (get-outflow-inflow)
  (let (
    (total-withdrawals (unwrap-panic (contract-call? .reserve-v1 get-stx-for-withdrawals)))
    (total-idle (unwrap-panic (contract-call? .reserve-v1 get-stx-balance)))

    (outflow 
      (if (> total-withdrawals total-idle)
        (- total-withdrawals total-idle)
        u0
      )
    )

    (inflow 
      (if (> total-idle total-withdrawals )
        (- total-idle total-withdrawals )
        u0
      )
    )
  )
    { outflow: outflow, inflow: inflow, total-stacking: (get-total-stacking), total-idle: total-idle, total-withdrawals: total-withdrawals }
  )
)

;;-------------------------------------
;; Perform pool delegation
;;-------------------------------------

;; Perform delegation to pool
;; If amount in delegates-info list is 0, delegation is revoked. Otherwise, delegation is set.
(define-public (perform-pool-delegation (reserve-contract <reserve-trait>) (pool principal) (delegates-info (list 10 { delegate: <stacking-delegate-trait>, amount: uint})))
  (let (
    (reserve-list (list-10-reserve-trait reserve-contract))
    (delegate-to-list (list-10-principal pool))

    ;; TODO: is this block correct?
    (burn-ht-list (list-10-uint (get-next-cycle-end-burn-height)))
  )
    (try! (contract-call? .dao check-is-protocol tx-sender))

    (let (
      (helper-result (map perform-pool-delegation-helper delegates-info reserve-list delegate-to-list burn-ht-list))
      (helper-errors (filter is-error helper-result))
      (helper-error (element-at? helper-errors u0))
    )
      (asserts! (is-eq helper-error none) (unwrap-panic helper-error))
      (ok true)
    )
  )
)

(define-private (perform-pool-delegation-helper (delegate-info { delegate: <stacking-delegate-trait>, amount: uint}) (reserve-contract <reserve-trait>) (delegate-to principal) (until-burn-ht uint))
  (let (
    (delegate-contract (get delegate delegate-info))
    (delegate-amount (get amount delegate-info))
  )
    (if (is-eq delegate-amount u0)
      (try! (contract-call? delegate-contract revoke reserve-contract))
      (try! (contract-call? delegate-contract revoke-and-delegate reserve-contract (get amount delegate-info) delegate-to until-burn-ht))
    )

    (ok true)
  )
)

;;-------------------------------------
;; Helpers
;;-------------------------------------

(define-read-only (is-error (response (response bool uint)))
  (is-err response)
)

(define-read-only (list-10-uint (item uint)) 
  (list item item item item item item item item item item)
)

(define-read-only (list-10-principal (item principal)) 
  (list item item item item item item item item item item)
)

(define-read-only (list-10-reserve-trait (item <reserve-trait>)) 
  (list item item item item item item item item item item)
)
