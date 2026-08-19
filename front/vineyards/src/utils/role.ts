export function getRole(): string {
  return localStorage.getItem("role") ?? "operario"
}

export function isAdmin(): boolean {
  return getRole() === "admin"
}

export function canDelete(): boolean {
  const role = getRole()
  return role === "admin" || role === "enologo"
}

export function canSeeDeleted(): boolean {
  return getRole() === "admin"
}
