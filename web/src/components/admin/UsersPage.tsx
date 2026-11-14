"use client";

import { useSearchParams } from "next/navigation";
import AdminUserView from "./AdminUserView";
import UsersSearch from "./UsersSearch";

const UUID = /^[0-9a-f-]{36}$/i;

// /admin/itilizate : la recherche, ou la fiche d'un compte avec ?id=…
export default function UsersPage() {
  const id = useSearchParams().get("id");
  return id && UUID.test(id) ? (
    <AdminUserView key={id} id={id} />
  ) : (
    <UsersSearch />
  );
}
