import React, { useEffect, useMemo, useState } from 'react';
import { useMeta } from '../contexts';
import { Art, Artist, ArtType } from '../types';
import {
  Edition,
  IMetadataExtension,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  ParsedAccount,
  StringPublicKey,
} from '@oyster/common';
import { WhitelistedCreator } from '../models/metaplex';
import { Cache } from 'three';
import { useInView } from 'react-intersection-observer';
import { pubkeyToString } from '../utils/pubkeyToString';
import ArweaveNodeProvider from '../utils/arweaveNodeProvider';

const metadataToArt = (
  info: Metadata | undefined,
  editions: Record<string, ParsedAccount<Edition>>,
  masterEditions: Record<
    string,
    ParsedAccount<MasterEditionV1 | MasterEditionV2>
  >,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
) => {
  let type: ArtType = ArtType.NFT;
  let editionNumber: number | undefined = undefined;
  let maxSupply: number | undefined = undefined;
  let supply: number | undefined = undefined;

  if (info) {
    const masterEdition = masterEditions[info.masterEdition || ''];
    const edition = editions[info.edition || ''];
    if (edition) {
      const myMasterEdition = masterEditions[edition.info.parent || ''];
      if (myMasterEdition) {
        type = ArtType.Print;
        editionNumber = edition.info.edition.toNumber();
        supply = myMasterEdition.info?.supply.toNumber() || 0;
      }
    } else if (masterEdition) {
      type = ArtType.Master;
      maxSupply = masterEdition.info.maxSupply?.toNumber();
      supply = masterEdition.info.supply.toNumber();
    }
  }

  return {
    uri: info?.data.uri || '',
    mint: info?.mint,
    title: info?.data.name,
    creators: (info?.data.creators || [])
      .map(creator => {
        const knownCreator = whitelistedCreatorsByCreator[creator.address];

        return {
          address: creator.address,
          verified: creator.verified,
          share: creator.share,
          image: knownCreator?.info.image || '',
          name: knownCreator?.info.name || '',
          link: knownCreator?.info.twitter || '',
        } as Artist;
      })
      .sort((a, b) => {
        const share = (b.share || 0) - (a.share || 0);
        if (share === 0) {
          return a.name.localeCompare(b.name);
        }

        return share;
      }),
    seller_fee_basis_points: info?.data.sellerFeeBasisPoints || 0,
    edition: editionNumber,
    maxSupply,
    supply,
    type,
  } as Art;
};

const cachedImages = new Map<string, string>();
export const useCachedImage = (id: string, cacheMesh?: boolean) => {
  const [cachedBlob, setCachedBlob] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    const result = cachedImages.get(id);
    if (result) {
      setCachedBlob(result);
      return;
    }

    ArweaveNodeProvider.getProvider()
      .transactions.getData(id, { decode: true })
      .then(async response => {
        const blob = await new Blob([response]);

        if (cacheMesh) {
          // extra caching for meshviewer
          Cache.enabled = true;
          Cache.add(id, await blob.arrayBuffer());
        }
        const blobURI = URL.createObjectURL(blob);
        cachedImages.set(id, blobURI);
        setCachedBlob(blobURI);
        setIsLoading(false);
      })
      .catch(() => {
        // If external URL, just use the uri
        //if (uri?.startsWith('http')) {
        //  setCachedBlob(uri);
        //}
        setIsLoading(false);
        ArweaveNodeProvider.setError();
      });
  }, [id, setCachedBlob, setIsLoading]);

  return { cachedBlob, isLoading };
};

export const useArt = (key?: StringPublicKey) => {
  const { metadata, editions, masterEditions, whitelistedCreatorsByCreator } =
    useMeta();

  const account = useMemo(
    () => metadata.find(a => a.pubkey === key),
    [key, metadata],
  );

  const art = useMemo(
    () =>
      metadataToArt(
        account?.info,
        editions,
        masterEditions,
        whitelistedCreatorsByCreator,
      ),
    [account, editions, masterEditions, whitelistedCreatorsByCreator],
  );

  return art;
};

export const useExtendedArt = (id?: StringPublicKey) => {
  const { metadata } = useMeta();

  const [data, setData] = useState<IMetadataExtension>();
  const [init, setInit] = useState(false);
  const { ref, inView } = useInView();

  const key = pubkeyToString(id);

  const account = useMemo(
    () => metadata.find(a => a.pubkey === key),
    [key, metadata],
  );

  if (!init && id && !data) {
    setInit(true);
    const cleanURI = (uri: string) => {
      let s = uri.split('/');
      return s[s.length - 1].slice(0, 43); // An string id on arweave've 43 characters
    };

    if (account && account.info.data.uri) {
      const id = cleanURI(account.info.data.uri);
      const processJson = (extended: any) => {
        if (!extended || extended?.properties?.files?.length === 0) {
          return;
        }

        if (extended?.image) {
          const file = extended.image.startsWith('http')
            ? extended.image
            : `${account.info.data.uri}/${extended.image}`;
          extended.image = cleanURI(file);
        }

        return extended;
      };

      try {
        const cached = localStorage.getItem(id);
        if (cached) {
          setData(processJson(JSON.parse(cached)));
        } else {
          // TODO: BL handle concurrent calls to avoid double query ¿??

          ArweaveNodeProvider.getProvider()
            .transactions.getData(id, { decode: true, string: true })
            .then(async _ => {
              try {
                const data = await JSON.parse(_);
                try {
                  localStorage.setItem(id, JSON.stringify(data));
                } catch {
                  // ignore
                }
                setData(processJson(data));
              } catch {
                return undefined;
              }
            })
            .catch(() => {
              ArweaveNodeProvider.setError();
              return undefined;
            });
        }
      } catch (ex) {
        console.error(ex);
      }
    }
  }
  return { ref, data };
};
