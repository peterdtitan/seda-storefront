import Image from "next/image";

const SOURCES = {
  wordmark: { ratio: 1539 / 699, file: (tone: Tone) => `/logo/wordmark-${tone}.png` },
  mark: { ratio: 970 / 1495, file: (tone: Tone) => `/logo/mark-${tone}.png` },
} as const;

type Tone = "oxblood" | "cream" | "ink";

export function Logo({
  kind = "wordmark",
  tone = "oxblood",
  height,
  alt = "Șèdá",
  priority,
}: {
  kind?: keyof typeof SOURCES;
  tone?: Tone;
  height: number;
  alt?: string;
  priority?: boolean;
}) {
  const source = SOURCES[kind];
  return (
    <Image
      src={source.file(tone)}
      alt={alt}
      height={height}
      width={Math.round(height * source.ratio)}
      priority={priority}
    />
  );
}
