import type { Department, PublicUser } from "@/lib/types";
export function canEditClientDepartment(user: PublicUser, department: Department) { return user.role === "Admin" || user.departmentIds.includes(department); }
