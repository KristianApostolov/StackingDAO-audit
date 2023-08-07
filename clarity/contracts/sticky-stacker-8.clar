;; @contract Sticky Stacker Contract
;; @version 1

;; Stacker can initiate stacking, increase or extend
;; Stacks the STX tokens in pox-3

;; Mainnet pox contract: SP000000000000000000002Q6VF78.pox-3 -- TODO: update for mainnet
;; Random addr to use for hashbytes testing: 0x00 & 0xf632e6f9d29bfb07bc8948ca6e0dd09358f003ac

(use-trait sticky-reserve-trait .sticky-reserve-trait-v1.sticky-reserve-trait)

;;-------------------------------------
;; Constants 
;;-------------------------------------

(define-constant ERR_NOT_AUTHORIZED u14401)

;;-------------------------------------
;; Variables 
;;-------------------------------------

(define-data-var stacking-unlock-burn-height uint u0) ;; When is this cycle over
(define-data-var stacking-stx-stacked uint u0) ;; How many stx did we stack in this cycle

;;-------------------------------------
;; Getters 
;;-------------------------------------

(define-read-only (get-stacking-unlock-burn-height)
  (var-get stacking-unlock-burn-height)
)

;; Gets the variable info directly
;; However, when stacking stopped this var is not reset to 0
;; Use method `get-stx-stacked` to know how many STX stacked
(define-read-only (get-stacking-stx-stacked)
  (var-get stacking-stx-stacked)
)

(define-read-only (get-stx-balance)
  (stx-get-balance (as-contract tx-sender))
)

(define-read-only (get-stx-stacked)
  (if (> burn-block-height (get-stacking-unlock-burn-height))
    u0
    (var-get stacking-stx-stacked)
  )
)

(define-read-only (get-stacker-info)
  ;; TODO: update for mainnet
  (contract-call? .pox-3-mock get-stacker-info (as-contract tx-sender))
)

(define-read-only (get-stx-account)
  ;; TODO: update for mainnet
  (contract-call? .pox-3-mock stx-account-mock (as-contract tx-sender))
  ;; (stx-account (as-contract tx-sender))
)

(define-read-only (get-pox-info)
  ;; TODO: update for mainnet
  (unwrap-panic (contract-call? .pox-3-mock get-pox-info))
)

;;-------------------------------------
;; Stacking helpers (error int to uint)
;;-------------------------------------

(define-read-only (pox-can-stack-stx
    (pox-address (tuple (version (buff 1)) (hashbytes (buff 32))))
    (tokens-to-stack uint)
    (start-burn-height uint)
    (lock-period uint)
  )
  ;; TODO: update for mainnet
  (match (as-contract (contract-call? .pox-3-mock can-stack-stx pox-address tokens-to-stack start-burn-height lock-period))
    result (ok result)
    error (err (to-uint error))
  )
)

(define-private (pox-stack-stx
    (pox-address (tuple (version (buff 1)) (hashbytes (buff 32))))
    (tokens-to-stack uint)
    (start-burn-height uint)
    (lock-period uint)
  )
  ;; TODO: update for mainnet
  (match (as-contract (contract-call? .pox-3-mock stack-stx tokens-to-stack pox-address start-burn-height lock-period))
    result (ok result)
    error (err (to-uint error))
  )
)

(define-private (pox-stack-increase (additional-tokens-to-stack uint))
  ;; TODO: update for mainnet
  (match (as-contract (contract-call? .pox-3-mock stack-increase additional-tokens-to-stack))
    result (ok result)
    error (err (to-uint error))
  )
)

(define-private (pox-stack-extend (extend-count uint) (pox-address { version: (buff 1), hashbytes: (buff 32) }))
  ;; TODO: update for mainnet
  (match (as-contract (contract-call? .pox-3-mock stack-extend extend-count pox-address))
    result (ok result)
    error (err (to-uint error))
  )
)

;;-------------------------------------
;; Stacking 
;;-------------------------------------

;; Initiate stacking
;; Only to be called when contract is not stacking yet
(define-public (initiate-stacking
    (reserve-trait <sticky-reserve-trait>)
    (pox-address (tuple (version (buff 1)) (hashbytes (buff 32))))
    (tokens-to-stack uint)
    (start-burn-height uint)
    (lock-period uint)
  )
  (begin
    (try! (contract-call? .sticky-dao check-is-protocol tx-sender))
    (try! (contract-call? .sticky-dao check-is-enabled))
    (try! (contract-call? .sticky-dao check-is-protocol (contract-of reserve-trait)))

    ;; Check if possible to stack
    (try! (pox-can-stack-stx pox-address tokens-to-stack start-burn-height lock-period))

    ;; Get STX tokens from reserve
    (try! (as-contract (contract-call? reserve-trait request-stx-to-stack tokens-to-stack)))

    ;; Stack
    (let (
      (result (try! (pox-stack-stx pox-address tokens-to-stack start-burn-height lock-period)))
    )
      (var-set stacking-unlock-burn-height (get unlock-burn-height result))
      (var-set stacking-stx-stacked (get lock-amount result))
    )

    (ok tokens-to-stack)
  )
)

;; Call when extra STX tokens need to be stacked. Call `stack-extend` afterwards.
(define-public (stack-increase (reserve-trait <sticky-reserve-trait>) (additional-tokens-to-stack uint))
  (let (
    (stx-balance (get-stx-balance))
  )
    (try! (contract-call? .sticky-dao check-is-protocol tx-sender))
    (try! (contract-call? .sticky-dao check-is-enabled))
    (try! (contract-call? .sticky-dao check-is-protocol (contract-of reserve-trait)))

    ;; Get extra STX tokens
    (try! (contract-call? reserve-trait request-stx-to-stack additional-tokens-to-stack))

    ;; Increase stacking
    (let (
      (result (try! (pox-stack-increase additional-tokens-to-stack)))
    )
      (var-set stacking-stx-stacked (get total-locked result))
    )

    (ok additional-tokens-to-stack)
  )
)

;; Extend stacking cycle. Should be called after `stack-increase`.
(define-public (stack-extend (extend-count uint) (pox-address { version: (buff 1), hashbytes: (buff 32) }))
  (begin
    (try! (contract-call? .sticky-dao check-is-protocol tx-sender))
    (try! (contract-call? .sticky-dao check-is-enabled))

    ;; Extend stacking
    (let (
      (result (try! (pox-stack-extend extend-count pox-address)))
    )
      (var-set stacking-unlock-burn-height (get unlock-burn-height result))
    )

    (ok extend-count)
  )
)

;;-------------------------------------
;; Admin 
;;-------------------------------------

;; Return STX to the STX reserve
(define-public (return-stx (reserve-trait <sticky-reserve-trait>))
  (let (
    (stx-amount (stx-get-balance (as-contract tx-sender)))
  )
    (try! (contract-call? .sticky-dao check-is-enabled))
    (try! (contract-call? .sticky-dao check-is-protocol (contract-of reserve-trait)))

    (if (> stx-amount u0)
      (try! (as-contract (contract-call? reserve-trait return-stx-from-stacking stx-amount)))
      u0
    )
    (ok stx-amount)
  )
)
