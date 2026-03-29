from aiogram.types import LabeledPrice

from app.engine.blocks.base import BaseBlockHandler, BlockResult


class PaymentBlockHandler(BaseBlockHandler):
    """Send an invoice for payment via Telegram Payments / Stars."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        # Check if this is a successful payment callback
        message = update_data.get("message", {})
        if message.get("successful_payment"):
            variables["payment_status"] = "success"
            variables["payment_amount"] = message["successful_payment"].get("total_amount", 0)
            return BlockResult(next_handle="payment_success", variables=variables)

        # Check for pre-checkout query
        pre_checkout = update_data.get("pre_checkout_query")
        if pre_checkout:
            await bot.answer_pre_checkout_query(pre_checkout["id"], ok=True)
            return BlockResult(variables=variables, wait_input=True)

        # Send invoice
        title = node["data"].get("title", "Оплата")
        description = node["data"].get("description", "Оплата услуги")
        amount = int(node["data"].get("amount", 100))
        currency = node["data"].get("currency", "XTR")  # XTR = Telegram Stars
        provider_token = node["data"].get("provider_token", "")

        title = self.interpolate(title, variables)
        description = self.interpolate(description, variables)

        prices = [LabeledPrice(label=title, amount=amount)]

        if currency == "XTR":
            # Telegram Stars — no provider_token needed
            await bot.send_invoice(
                chat_id=chat_id,
                title=title,
                description=description,
                payload=f"botforge_{node.get('id', 'payment')}",
                currency="XTR",
                prices=prices,
            )
        else:
            await bot.send_invoice(
                chat_id=chat_id,
                title=title,
                description=description,
                payload=f"botforge_{node.get('id', 'payment')}",
                provider_token=provider_token,
                currency=currency,
                prices=prices,
            )

        return BlockResult(variables=variables, wait_input=True)
