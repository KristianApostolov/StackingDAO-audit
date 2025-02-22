;; @contract Rewards
;; @version 1
;;
;; PoX rewards are added here via `add-rewards`. The pool owner can add the rewards
;; here, or transfer the rewards to the delegates. The delegates will make sure these rewards
;; are added here.
;;
;; Added rewards are kept in this contract until the end of the cycle. At the end of the
;; cycle the method `process-rewards` can be called to actually add the STX rewards to the reserve.
;;
;; We can not add rewards during the cycle, as a user could stack right before the rewards are added,
;; and unstack right after. His stSTX will become more valuable while his STX was never stacked.
;; To prevent this, rewards can only be added in the last blocks (withdraw offset) of the cycle.

(impl-trait .rewards-trait-v1.rewards-trait)
(use-trait commission-trait .commission-trait-v1.commission-trait)
(use-trait staking-trait .staking-trait-v1.staking-trait)

;;-------------------------------------
;; Constants 
;;-------------------------------------

(define-constant ERR_CAN_NOT_PROCESS_YET u203001)

;;-------------------------------------
;; Variables 
;;-------------------------------------

(define-data-var total-commission uint u0)
(define-data-var total-rewards-left uint u0)
(define-data-var rewards-unlock uint u0)

;;-------------------------------------
;; Getters
;;-------------------------------------

(define-read-only (get-total-commission)
  (var-get total-commission)
)

(define-read-only (get-total-rewards-left)
  (var-get total-rewards-left)
)

(define-read-only (get-rewards-unlock)
  (var-get rewards-unlock)
)

(define-read-only (next-rewards-unlock)
  (let (
    (start-block-next-cycle (reward-cycle-to-burn-height (+ (get-pox-cycle) u1)))
    (withdrawal-offset (contract-call? .data-core-v1 get-cycle-withdraw-offset))
  )
    (- start-block-next-cycle withdrawal-offset)
  )
)

;;-------------------------------------
;; Add rewards
;;-------------------------------------

;; Rewards might be transferred to the delegates. 
;; When executing a strategy, rewards in delegates are handled and added via `add-rewards`
;; Or they must be added manually by the pool owner via `add-rewards`
;; The `process-rewards` method can be called at the end of each cycle.

(define-public (add-rewards 
  (pool principal)
  (stx-amount uint) 
) 
  (let (
    (commission (contract-call? .data-pools-v1 get-pool-commission pool))
    (commission-amount (/ (* stx-amount commission) u10000))
    (rewards-left (- stx-amount commission-amount))

    (pool-owner-commission (contract-call? .data-pools-v1 get-pool-owner-commission pool))
    (pool-owner-amount (/ (* commission-amount (get share pool-owner-commission)) u10000))
    (protocol-amount (- commission-amount pool-owner-amount))
  )
    (var-set total-commission (+ (var-get total-commission) protocol-amount))
    (var-set total-rewards-left (+ (var-get total-rewards-left) rewards-left))

    (var-set rewards-unlock (next-rewards-unlock))

    (print { action: "add-rewards", data: { cycle: (get-pox-cycle), pool: pool, stx-amount: stx-amount, rewards-unlock: (var-get rewards-unlock), commission-amount: commission-amount, rewards-left: rewards-left, block-height: block-height } })
    (try! (stx-transfer? stx-amount tx-sender (as-contract tx-sender)))

    (if (> pool-owner-amount u0)
      (as-contract (stx-transfer? pool-owner-amount tx-sender (get receiver pool-owner-commission)))
      (ok true)
    )
  )
)

(define-public (process-rewards 
  (commission-contract <commission-trait>) 
  (staking-contract <staking-trait>) 
  (reserve principal) 
)
  (begin
    (try! (contract-call? .dao check-is-enabled))
    (try! (contract-call? .dao check-is-protocol reserve))
    (try! (contract-call? .dao check-is-protocol (contract-of commission-contract)))
    (try! (contract-call? .dao check-is-protocol (contract-of staking-contract)))
    (asserts! (> burn-block-height (var-get rewards-unlock)) (err ERR_CAN_NOT_PROCESS_YET))

    (if (> (var-get total-commission) u0)
      (try! (as-contract (contract-call? commission-contract add-commission staking-contract (var-get total-commission))))
      u0
    )

    (if (> (var-get total-rewards-left) u0)
      (try! (as-contract (stx-transfer? (var-get total-rewards-left) tx-sender reserve)))
      false
    )

    (var-set total-commission u0)
    (var-set total-rewards-left u0)

    (print { action: "process-rewards", data: { cycle: (get-pox-cycle), commission-amount: (var-get total-commission), rewards-left: (var-get total-rewards-left), block-height: block-height } })
    (ok true)
  )
)

;;-------------------------------------
;; Admin
;;-------------------------------------

(define-public (get-stx (requested-stx uint) (receiver principal))
  (begin
    (try! (contract-call? .dao check-is-protocol contract-caller))

    (try! (as-contract (stx-transfer? requested-stx tx-sender receiver)))
    (ok requested-stx)
  )
)

;;-------------------------------------
;; PoX Helpers
;;-------------------------------------

(define-read-only (get-pox-cycle)
  (if is-in-mainnet
    ;; TODO: Update to pox-4
    (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle)
    (contract-call? .pox-4-mock current-pox-reward-cycle)
  )
)

(define-read-only (reward-cycle-to-burn-height (cycle-id uint)) 
  (if is-in-mainnet
    ;; TODO: Update to pox-4
    (contract-call? 'SP000000000000000000002Q6VF78.pox-3 reward-cycle-to-burn-height cycle-id)
    (contract-call? .pox-4-mock reward-cycle-to-burn-height cycle-id)
  )
)
