export function getTagColorClasses(tagName: string | null): string {
  switch (tagName) {
    case "Agency":
      return "bg-purple-200 text-purple-900";
    case "Director":
      return "bg-orange-200 text-orange-900";
    case "Client":
      return "bg-green-200 text-green-900";
    case "Internal":
      return "bg-blue-200 text-blue-900";
    case null:
      return "bg-zinc-300 text-zinc-700";
    default:
      return "bg-red-200 text-red-900";
  }
}
