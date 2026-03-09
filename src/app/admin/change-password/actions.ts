"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export async function changePassword(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "인증이 필요합니다." };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // 유효성 검사
  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "모든 필드를 입력해주세요." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "새 비밀번호가 일치하지 않습니다." };
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return { success: false, error: "비밀번호는 8자 이상, 영문+숫자+특수문자를 포함해야 합니다." };
  }

  if (currentPassword === newPassword) {
    return { success: false, error: "현재 비밀번호와 다른 비밀번호를 입력해주세요." };
  }

  // 현재 비밀번호 확인
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { success: false, error: "비밀번호 정보를 찾을 수 없습니다." };
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "현재 비밀번호가 올바르지 않습니다." };
  }

  // 비밀번호 변경
  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  return { success: true };
}
