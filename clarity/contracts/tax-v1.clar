;; @contract Tax
;; @version 1

(impl-trait 'SP3C0TCQS0C0YY8E0V3EJ7V4X9571885D44M8EFWF.arkadiko-automation-trait-v1.automation-trait)
(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;;-------------------------------------
;; Variables
;;-------------------------------------

(define-constant ERR_SHOULD_NOT_HANDLE u21001)
(define-constant ERR_COULD_NOT_SWAP u21002)
(define-constant ERR_COULD_NOT_ADD_LIQ u21003)

;;-------------------------------------
;; Variables
;;-------------------------------------

(define-data-var min-balance-to-handle uint u100000000) ;; 100
(define-data-var percentage-to-swap uint u4000) ;; bps

;;-------------------------------------
;; Getters
;;-------------------------------------

(define-read-only (get-min-balance-to-handle)
  (var-get min-balance-to-handle)
)

(define-read-only (get-percentage-to-swap)
  (var-get percentage-to-swap)
)

;;-------------------------------------
;; Arkadiko Keeper functions
;;-------------------------------------

(define-public (initialize)
  (ok true)
)

(define-read-only (check-job)
  (ok (should-handle-tax))
)

(define-public (run-job)
  (handle-tax)
)

;;-------------------------------------
;; Handle tax 
;;-------------------------------------

(define-read-only (should-handle-tax)
  (let (
    (balance (stx-get-balance (as-contract tx-sender)))
  )
    (if (>= balance (get-min-balance-to-handle))
      true
      false
    )
  )
)

;; Need to be called by keeper
(define-public (handle-tax)
  (begin
    (asserts! (should-handle-tax) (err ERR_SHOULD_NOT_HANDLE))

    (let (
      (balance (stx-get-balance (as-contract tx-sender)))
      (to-swap (/ (* balance (var-get percentage-to-swap)) u10000))
    )
      ;; Swap STX for stDAO
      ;; TODO: update for mainnet
      (unwrap! (as-contract (contract-call? .swap swap-y-for-x 
        .wstx-token
        .stdao-token
        .swap-lp-token
        to-swap 
        u1
      )) (err ERR_COULD_NOT_SWAP))

      ;; Add stDAO/STX liquidity
      ;; TODO: update for mainnet
      (let (
        (new-balance-stx (stx-get-balance (as-contract tx-sender)))
        (new-balance-stdao (unwrap-panic (contract-call? .stdao-token get-balance (as-contract tx-sender))))
      )
        (unwrap! (as-contract (contract-call? .swap add-liquidity
          .stdao-token
          .wstx-token
          .swap-lp-token
          new-balance-stdao
          new-balance-stx
          u1
        )) (err ERR_COULD_NOT_ADD_LIQ))
      )

      (ok true)
    )
  )
)

;;-------------------------------------
;; Admin 
;;-------------------------------------

(define-public (retreive-stx-tokens (requested-stx uint) (receiver principal))
  (begin
    (try! (contract-call? .dao check-is-protocol tx-sender))

    (try! (as-contract (stx-transfer? requested-stx tx-sender receiver)))
    (ok requested-stx)
  )
)

(define-public (retreive-tokens (token <ft-trait>) (requested-tokens uint) (receiver principal))
  (begin
    (try! (contract-call? .dao check-is-protocol tx-sender))

    (try! (as-contract (contract-call? token transfer requested-tokens tx-sender receiver none)))
    (ok requested-tokens)
  )
)

(define-public (set-min-balance-to-handle (min-balance uint))
  (begin
    (try! (contract-call? .dao check-is-protocol tx-sender))

    (var-set min-balance-to-handle min-balance)
    (ok true)
  )
)

(define-public (set-percentage-to-swap (new-percentage uint))
  (begin
    (try! (contract-call? .dao check-is-protocol tx-sender))

    (var-set percentage-to-swap new-percentage)
    (ok true)
  )
)
