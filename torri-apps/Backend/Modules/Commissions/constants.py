import enum


class CommissionPaymentStatus(str, enum.Enum):
    """
    Defines the payment status of a commission.
    """
    PENDING = "PENDING"      # Commission is calculated but not yet paid
    PAID = "PAID"            # Commission has been paid to the professional
    REVERSED = "REVERSED"    # Commission payment was reversed/cancelled


class CommissionPaymentMethod(str, enum.Enum):
    """
    Defines the payment methods used for commission payments.
    Focused on Brazilian payment methods.
    """
    CASH = "CASH"                    # Cash payment
    PIX = "PIX"                      # Brazilian instant payment system
    BANK_TRANSFER = "BANK_TRANSFER"  # Bank transfer/TED/DOC
    CARD = "CARD"                    # Credit/debit card
    OTHER = "OTHER"                  # Other payment method