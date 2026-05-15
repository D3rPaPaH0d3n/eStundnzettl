import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { activateOnEnterOrSpace } from "../keyboardActivation";

function keyboardEvent(key: string): KeyboardEvent<HTMLElement> {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe("activateOnEnterOrSpace", () => {
  it.each(["Enter", " "])("activates for %s", (key) => {
    const action = vi.fn();
    const event = keyboardEvent(key);

    activateOnEnterOrSpace(event, action);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
  });

  it("ignores other keys", () => {
    const action = vi.fn();
    const event = keyboardEvent("Escape");

    activateOnEnterOrSpace(event, action);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });
});
