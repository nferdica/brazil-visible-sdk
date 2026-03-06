import { describe, expect, it } from "vitest";
import {
  BVError,
  BVHttpError,
  BVTimeoutError,
  BVValidationError,
} from "../src/errors";

describe("BVError", () => {
  it("is an instance of Error", () => {
    const err = new BVError("test error", "bcb");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("test error");
    expect(err.source).toBe("bcb");
    expect(err.name).toBe("BVError");
  });
});

describe("BVHttpError", () => {
  it("carries status code and response body", () => {
    const err = new BVHttpError(404, "Not Found", "bcb");
    expect(err).toBeInstanceOf(BVError);
    expect(err.statusCode).toBe(404);
    expect(err.responseBody).toBe("Not Found");
    expect(err.source).toBe("bcb");
    expect(err.name).toBe("BVHttpError");
  });
});

describe("BVTimeoutError", () => {
  it("includes timeout duration", () => {
    const err = new BVTimeoutError(30000, "bcb");
    expect(err).toBeInstanceOf(BVError);
    expect(err.timeoutMs).toBe(30000);
    expect(err.message).toContain("30000");
    expect(err.name).toBe("BVTimeoutError");
  });
});

describe("BVValidationError", () => {
  it("includes field and constraint info", () => {
    const err = new BVValidationError("serie", "must be a positive integer", "bcb");
    expect(err).toBeInstanceOf(BVError);
    expect(err.field).toBe("serie");
    expect(err.constraint).toBe("must be a positive integer");
    expect(err.name).toBe("BVValidationError");
  });
});
