"""Work that runs after the response on a normal server. Serverless functions (Vercel) can be
frozen as soon as the response is sent, so there it runs inside the request instead."""

from collections.abc import Callable

from fastapi import BackgroundTasks

from .settings import get_settings


def later(tasks: BackgroundTasks, fn: Callable, *args) -> None:
    if get_settings().serverless:
        fn(*args)
    else:
        tasks.add_task(fn, *args)
