export function SortHead<K extends string>({
  label,
  column,
  active,
  dir,
  onSort,
}: {
  label: string;
  column: K;
  active: K;
  dir: "asc" | "desc";
  onSort: (column: K) => void;
}) {
  const on = active === column;
  return (
    <th aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={on ? "sort on" : "sort"} onClick={() => onSort(column)}>
        {label}
        {on ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

export function compareValues(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
  dir: "asc" | "desc",
): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  return String(a).localeCompare(String(b)) * mul;
}
