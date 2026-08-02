import Image, { type StaticImageData } from "next/image"

export function ArticleImage({
  src,
  alt,
  priority = false,
  fit = "cover",
}: {
  src: StaticImageData
  alt: string
  priority?: boolean
  fit?: "contain" | "cover"
}) {
  return (
    <figure className="dip-project-media">
      <div className="dip-project-frame dip-interview-image-frame">
        <Image
          className="dip-interview-image"
          data-fit={fit}
          src={src}
          alt={alt}
          sizes="(max-width: 640px) calc(100vw - 48px), 582px"
          priority={priority}
        />
      </div>
    </figure>
  )
}
