from fastapi import HTTPException

PLAN_LIMITS = {
    "free": {
        "max_bots": 1,
        "max_subscribers": 100,
        "ai_generations_per_month": 3,
        "can_export": False,
        "can_use_gpt_block": False,
        "sleep_after_hours": 48,
    },
    "starter": {
        "max_bots": 3,
        "max_subscribers": 1000,
        "ai_generations_per_month": 30,
        "can_export": True,
        "can_use_gpt_block": True,
        "sleep_after_hours": None,
    },
    "pro": {
        "max_bots": 10,
        "max_subscribers": None,  # unlimited
        "ai_generations_per_month": None,  # unlimited
        "can_export": True,
        "can_use_gpt_block": True,
        "sleep_after_hours": None,
    },
}


def get_limits(plan: str) -> dict:
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


async def check_can_start_bot(user, running_bots_count: int):
    limits = get_limits(user.plan)
    if running_bots_count >= limits["max_bots"]:
        raise HTTPException(
            status_code=403,
            detail=f"Лимит ботов для тарифа '{user.plan}': {limits['max_bots']}. "
                   f"Перейдите на более высокий тариф.",
        )


async def check_ai_quota(user, generations_this_month: int):
    limits = get_limits(user.plan)
    max_gen = limits["ai_generations_per_month"]
    if max_gen is not None and generations_this_month >= max_gen:
        raise HTTPException(
            status_code=403,
            detail=f"Лимит AI-генераций ({max_gen}/мес) для тарифа '{user.plan}' исчерпан.",
        )
