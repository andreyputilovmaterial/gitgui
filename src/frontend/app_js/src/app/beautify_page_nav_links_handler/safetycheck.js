

export default function check(urlRaw) {
  return (new URL(urlRaw,window.location.origin)).origin==window.location.origin
}
