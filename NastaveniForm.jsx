"use client";
import { fmtMoney } from "@/lib/theme";
import PhotoThumbnail, { useSignedUrl } from "./PhotoThumbnail";

export { useSignedUrl };

export default function ReceiptThumbnail({ receipt, onOpen }) {
  return (
    <PhotoThumbnail
      bucket="uctenky"
      path={receipt.path}
      alt="Účtenka"
      caption={receipt.castka ? fmtMoney(receipt.castka) : null}
      onOpen={onOpen}
    />
  );
}
