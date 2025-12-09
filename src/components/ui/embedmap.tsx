import Link from "next/link";

export type EmbedMapProps = {
  zipCode: string;
  wrapperClassName?: string;
  iframeClassName?: string;
};

export function EmbedMap({ zipCode, wrapperClassName = 
"", iframeClassName = "",
 }: EmbedMapProps) {
  return (
    <div
      className={
        // default wrapper styles
        `rounded-lg overflow-hidden border shadow-sm ${wrapperClassName}`
      }
    >
      <iframe
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://www.google.com/maps?q=${zipCode}&output=embed`}
        className={
          // default iframe styles
          `w-full h-48 ${iframeClassName}
          `
        }
      />
      
    </div>
  );
}
