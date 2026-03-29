import httpx

from app.engine.blocks.base import BaseBlockHandler, BlockResult


class WebhookBlockHandler(BaseBlockHandler):
    """Send/receive data via HTTP webhook."""

    async def execute(self, node, bot, chat_id, update_data, variables) -> BlockResult:
        url = node["data"].get("url", "")
        method = node["data"].get("method", "POST").upper()
        headers = node["data"].get("headers", {})

        if not url:
            return BlockResult(next_handle=None, variables=variables)

        url = self.interpolate(url, variables)

        # Build payload from variables
        payload_template = node["data"].get("payload", {})
        payload = {}
        for key, value in payload_template.items():
            payload[key] = self.interpolate(str(value), variables) if isinstance(value, str) else value

        # Add standard fields
        payload.setdefault("chat_id", chat_id)
        payload.setdefault("variables", variables)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                if method == "GET":
                    resp = await client.get(url, headers=headers, params=payload)
                else:
                    resp = await client.post(url, headers=headers, json=payload)

                resp.raise_for_status()
                response_data = resp.json()

                # Save response variables
                save_to = node["data"].get("save_response_to")
                if save_to:
                    variables[save_to] = response_data

                # Extract specific fields
                extract = node["data"].get("extract_fields", {})
                for var_name, json_path in extract.items():
                    value = response_data
                    for key in json_path.split("."):
                        if isinstance(value, dict):
                            value = value.get(key)
                        else:
                            value = None
                            break
                    variables[var_name] = value

        except Exception as e:
            variables["webhook_error"] = str(e)
            if node["data"].get("send_error", False):
                await bot.send_message(chat_id=chat_id, text=f"Ошибка запроса: {e}")

        return BlockResult(next_handle=None, variables=variables)
