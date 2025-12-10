import { nftCatalog } from "./data";
import { NftSection } from "./nft-section";

export function NftGrid() {
  return (
    <section className="space-y-8">
      <NftSection title="Earnable NFTs" items={nftCatalog.earnable} />
      <NftSection title="NFTs Up For Grabs" items={nftCatalog.grabs} />
      <NftSection title="NFTs Acquired" items={nftCatalog.acquired} />
    </section>
  );
}

