import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

const userInclude = {
  establishment: { include: { company: true } },
} as const;

export type LocalAuthUser = {
  id: number;
  name: string;
  email: string;
  type: string;
  establishment_id: number;
  company: { id: number; name: string; tradeName: string | null; ruc: string };
};

export function getAdminEnv() {
  return {
    email: (process.env.ADMIN_EMAIL || "arcibesalvares@gmail.com").trim(),
    password: process.env.ADMIN_PASSWORD || "ARCHI2052",
    name: process.env.ADMIN_NAME || "ADMINISTRADOR",
  };
}

export function envCredentialsMatch(email: string, password: string) {
  const env = getAdminEnv();
  return email.trim().toLowerCase() === env.email.toLowerCase() && password === env.password;
}

function toLocalAuthUser(
  user: {
    id: number;
    name: string;
    email: string;
    type: string;
    establishmentId: number;
    establishment: { company: { id: number; name: string; tradeName: string | null; ruc: string } };
  }
): LocalAuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    type: user.type,
    establishment_id: user.establishmentId,
    company: user.establishment.company,
  };
}

/** Alinea el usuario admin en BD con ADMIN_EMAIL / ADMIN_PASSWORD del entorno. */
export async function syncAdminUserFromEnv() {
  const { email, password, name } = getAdminEnv();
  const hash = await bcrypt.hash(password, 10);

  let establishment = await prisma.establishment.findFirst({ include: { company: true } });
  if (!establishment) {
    const company =
      (await prisma.company.findFirst()) ??
      (await prisma.company.create({
        data: {
          name: process.env.COMPANY_NAME || "ALVARES ROSALES ARCIBES BENITO",
          tradeName: process.env.COMPANY_TRADE_NAME || "A&c RADIADORES",
          ruc: process.env.COMPANY_RUC || "10447860428",
        },
      }));
    establishment = await prisma.establishment.create({
      data: {
        code: "0000",
        description: "Oficina Principal",
        address: "AV. UNIVERSITARIA 2760, PILLCO MARCA, HUÁNUCO - HUÁNUCO",
        companyId: company.id,
      },
      include: { company: true },
    });
  }

  const existing =
    (await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: userInclude,
    })) ??
    (await prisma.user.findFirst({
      where: { type: "admin" },
      include: userInclude,
    }));

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { email, password: hash, name, type: "admin" },
      include: userInclude,
    });
    return toLocalAuthUser(updated);
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      type: "admin",
      establishmentId: establishment.id,
    },
    include: userInclude,
  });
  return toLocalAuthUser(created);
}

export async function localLogin(email: string, password: string): Promise<LocalAuthUser> {
  const trimmed = email.trim();

  const user = await prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    include: userInclude,
  });

  if (user && (await bcrypt.compare(password, user.password))) {
    return toLocalAuthUser(user);
  }

  if (envCredentialsMatch(trimmed, password)) {
    return syncAdminUserFromEnv();
  }

  throw new Error("Credenciales inválidas");
}
