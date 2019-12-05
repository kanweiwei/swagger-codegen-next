export default function lowerCase(s: string) {
    return s[0].toLocaleLowerCase() + s.slice(1, s.length);
}