// ============================================================
// COSFIT - Admin Permission Check Helper
// ============================================================

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type AdminMenu =
  | "data-collection"
  | "ingredients"
  | "reviews"
  | "data-quality"
  | "etl"
  | "admin-users"
  | "statistics"
  | "members"
  | "partners"
  | "commerce";

export type PermissionType = "view" | "create" | "edit";

export interface MenuPermission {
  view: boolean;
  create: boolean;
  edit: boolean;
}

export interface AdminPermissions {
  menuPermissions: Record<string, MenuPermission>;
}

export const ADMIN_MENUS: { key: AdminMenu; label: string }[] = [
  { key: "data-collection", label: "데이터 수집" },
  { key: "ingredients", label: "성분 관리" },
  { key: "reviews", label: "리뷰 수집" },
  { key: "data-quality", label: "데이터 품질" },
  { key: "etl", label: "ETL" },
  { key: "admin-users", label: "관리자 계정" },
  { key: "statistics", label: "통계" },
  { key: "members", label: "회원 관리" },
  { key: "partners", label: "입점사 관리" },
  { key: "commerce", label: "커머스" },
];

/**
 * 관리자 메뉴 권한 확인
 * Super Admin은 모든 권한을 가짐
 */
export async function checkAdminPermission(
  menu: AdminMenu,
  permission: PermissionType
): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: session.user.id },
  });

  if (!adminUser) return false;

  // Super Admin은 모든 권한
  if (adminUser.isSuperAdmin) return true;

  const permissions = adminUser.permissions as unknown as AdminPermissions;
  const menuPerm = permissions?.menuPermissions?.[menu];
  if (!menuPerm) return false;

  return menuPerm[permission] === true;
}

/**
 * 관리자 메뉴 권한 요구 (없으면 throw)
 */
export async function requireAdminPermission(
  menu: AdminMenu,
  permission: PermissionType
) {
  const allowed = await checkAdminPermission(menu, permission);
  if (!allowed) {
    throw new Error(`${menu} 메뉴의 ${permission} 권한이 없습니다.`);
  }
}

/**
 * 기본 권한 생성 (모든 메뉴 조회만 가능)
 */
export function createDefaultPermissions(): AdminPermissions {
  const menuPermissions: Record<string, MenuPermission> = {};
  for (const menu of ADMIN_MENUS) {
    menuPermissions[menu.key] = { view: true, create: false, edit: false };
  }
  return { menuPermissions };
}

/**
 * 전체 권한 생성 (Super Admin용)
 */
export function createFullPermissions(): AdminPermissions {
  const menuPermissions: Record<string, MenuPermission> = {};
  for (const menu of ADMIN_MENUS) {
    menuPermissions[menu.key] = { view: true, create: true, edit: true };
  }
  return { menuPermissions };
}
