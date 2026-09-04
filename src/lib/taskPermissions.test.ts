import { describe, it, expect } from "vitest";
import {
  normName,
  canChangePriority,
  canChangeDeadline,
  canChangeSubTaskProtected,
  isAssigneeOf,
  canAddSubTaskTo,
  isMyTask,
  displayPersonName,
  type Viewer,
} from "./taskPermissions";

const KUSHAN = "11111111-1111-1111-1111-111111111111";
const IMASHA = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";

/** Imasha: assignee, may edit, no blanket sub-task permission. */
const imasha: Viewer = {
  userId: IMASHA,
  employeeName: "Imasha Manamperi",
  isAdmin: false,
  canEdit: true,
  canCreateSubTask: false,
};
/** Kushan: the assigner. */
const kushan: Viewer = { ...imasha, userId: KUSHAN, employeeName: "Kushan Gunasekara" };
/** A Viewer-type role: can see, cannot edit. */
const viewerRole: Viewer = { ...imasha, userId: OTHER, employeeName: "Someone Else", canEdit: false };
const admin: Viewer = { ...imasha, userId: OTHER, isAdmin: true };

/** Kushan assigned this task to Imasha. */
const task = {
  assignee_id: IMASHA,
  assignee_name: "Imasha Manamperi",
  assigned_by: KUSHAN,
  created_by: KUSHAN,
};

describe("normName", () => {
  it("is case- and whitespace-insensitive", () => {
    expect(normName("Jane  Doe ")).toBe("jane doe");
    expect(normName("jane doe")).toBe("jane doe");
  });

  it("treats null/undefined/empty as an empty key", () => {
    expect(normName(null)).toBe("");
    expect(normName(undefined)).toBe("");
    expect(normName("   ")).toBe("");
  });
});

describe("canChangePriority / canChangeDeadline", () => {
  it("lets the assigner change priority", () => {
    expect(canChangePriority(task, kushan)).toBe(true);
  });

  it("does NOT let the assignee change priority", () => {
    expect(canChangePriority(task, imasha)).toBe(false);
  });

  it("lets an admin change priority on any task", () => {
    expect(canChangePriority(task, admin)).toBe(true);
  });

  it("allows it while creating a new task (no task yet)", () => {
    expect(canChangePriority(null, imasha)).toBe(true);
  });

  it("denies a signed-out viewer", () => {
    expect(canChangePriority(task, { ...imasha, userId: null })).toBe(false);
  });

  it("treats the creator as an assigner even if someone else is assigned_by", () => {
    expect(canChangePriority({ ...task, assigned_by: OTHER, created_by: IMASHA }, imasha)).toBe(true);
  });

  it("applies the identical rule to the deadline", () => {
    expect(canChangeDeadline(task, imasha)).toBe(false);
    expect(canChangeDeadline(task, kushan)).toBe(true);
  });
});

describe("canChangeSubTaskProtected", () => {
  const subTask = { assignee_id: IMASHA, assignee_name: "Imasha Manamperi", created_by: KUSHAN };

  it("lets the sub-task creator change protected fields", () => {
    expect(canChangeSubTaskProtected(task, subTask, kushan)).toBe(true);
  });

  it("does NOT let the sub-task assignee change them", () => {
    expect(canChangeSubTaskProtected(task, subTask, imasha)).toBe(false);
  });

  it("lets the parent task's assigner change them", () => {
    const madeBySomeoneElse = { ...subTask, created_by: OTHER };
    expect(canChangeSubTaskProtected(task, madeBySomeoneElse, kushan)).toBe(true);
  });

  it("denies when there is no parent and the viewer did not create it", () => {
    expect(canChangeSubTaskProtected(null, { ...subTask, created_by: OTHER }, imasha)).toBe(false);
  });

  it("allows it while creating a new sub-task", () => {
    expect(canChangeSubTaskProtected(task, null, imasha)).toBe(true);
  });
});

describe("isAssigneeOf", () => {
  it("matches on assignee_id", () => {
    expect(isAssigneeOf(task, imasha)).toBe(true);
  });

  it("matches by name when assignee_id is null (legacy rows)", () => {
    const byName = { ...task, assignee_id: null };
    expect(isAssigneeOf(byName, imasha)).toBe(true);
  });

  it("tolerates case and spacing differences in the name", () => {
    const messy = { ...task, assignee_id: null, assignee_name: "  imasha   manamperi " };
    expect(isAssigneeOf(messy, imasha)).toBe(true);
  });

  it("does NOT match a different person with the same first name", () => {
    // The database helper had exactly this bug: first-name-only matching let
    // two people named "Imasha" edit each other's tasks.
    const otherImasha = { ...imasha, userId: OTHER, employeeName: "Imasha Perera" };
    expect(isAssigneeOf({ ...task, assignee_id: null }, otherImasha)).toBe(false);
  });

  it("does not match when the viewer has no name and no id match", () => {
    const nameless = { ...imasha, userId: OTHER, employeeName: null };
    expect(isAssigneeOf({ ...task, assignee_id: null }, nameless)).toBe(false);
  });
});

describe("canAddSubTaskTo", () => {
  it("lets the assignee divide their own task when they can edit", () => {
    expect(canAddSubTaskTo(task, imasha)).toBe(true);
  });

  it("does NOT let an assignee without edit permission (a Viewer) do it", () => {
    const assignedViewer = { ...viewerRole, employeeName: "Imasha Manamperi" };
    expect(canAddSubTaskTo(task, assignedViewer)).toBe(false);
  });

  it("lets anyone holding the blanket create_subtask permission", () => {
    const other = { ...viewerRole, canCreateSubTask: true };
    expect(canAddSubTaskTo(task, other)).toBe(true);
  });

  it("does NOT let an unrelated editor divide someone else's task", () => {
    const unrelated = { ...imasha, userId: OTHER, employeeName: "Someone Else" };
    expect(canAddSubTaskTo(task, unrelated)).toBe(false);
  });

  it("returns false with no task", () => {
    expect(canAddSubTaskTo(null, admin)).toBe(false);
  });
});

describe("isMyTask", () => {
  it("includes a task assigned to the viewer", () => {
    expect(isMyTask(task, imasha)).toBe(true);
  });

  it("EXCLUDES a task the viewer assigned to someone else", () => {
    // Regression guard: My Tasks previously also listed delegated work.
    expect(isMyTask(task, kushan)).toBe(false);
  });

  it("includes a task whose sub-task is assigned to the viewer", () => {
    const parent = {
      assignee_id: OTHER,
      assignee_name: "Someone Else",
      assigned_by: KUSHAN,
      created_by: KUSHAN,
      sub_tasks: [{ assignee_id: IMASHA, assignee_name: "Imasha Manamperi", created_by: KUSHAN }],
    };
    expect(isMyTask(parent, imasha)).toBe(true);
  });

  it("excludes an unrelated task", () => {
    const unrelated = { assignee_id: OTHER, assignee_name: "Someone Else", assigned_by: KUSHAN, created_by: KUSHAN };
    expect(isMyTask(unrelated, imasha)).toBe(false);
  });

  it("handles a task with no sub_tasks array", () => {
    expect(isMyTask({ ...task, assignee_id: OTHER, assignee_name: "X", sub_tasks: null }, imasha)).toBe(false);
  });
});

describe("displayPersonName", () => {
  const employees = [
    { email: "kushan@corp.com", employee_name: "Kushan", last_name: "Gunasekara" },
    { email: "noname@corp.com", employee_name: "", last_name: "" },
  ];

  it("prefers the profile's full name", () => {
    expect(displayPersonName({ full_name: "Kushan Gunasekara", email: "kushan@corp.com" }, employees))
      .toBe("Kushan Gunasekara");
  });

  it("falls back to the Employee Master when the profile name is missing", () => {
    expect(displayPersonName({ full_name: null, email: "kushan@corp.com" }, employees))
      .toBe("Kushan Gunasekara");
  });

  it("never shows an email as a name", () => {
    // handle_new_user() seeds full_name with the email, so this case is real.
    expect(displayPersonName({ full_name: "kushan@corp.com", email: "kushan@corp.com" }, employees))
      .toBe("Kushan Gunasekara");
  });

  it("flags an unmapped user instead of guessing", () => {
    expect(displayPersonName({ full_name: null, email: "ghost@corp.com" }, employees))
      .toBe("Unmapped User");
  });

  it("returns Unmapped User for a null profile with no fallback", () => {
    expect(displayPersonName(null, employees)).toBe("Unmapped User");
  });

  it("does not return a blank name from an empty employee record", () => {
    expect(displayPersonName({ full_name: null, email: "noname@corp.com" }, employees))
      .toBe("Unmapped User");
  });
});
