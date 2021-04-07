// Copyright 2017-2021 @polkadot/apps, UseTech authors & contributors
// SPDX-License-Identifier: Apache-2.0

import './styles.scss';

import BN from 'bn.js';
import React, { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Form from 'semantic-ui-react/dist/commonjs/collections/Form';
import Grid from 'semantic-ui-react/dist/commonjs/collections/Grid';
import Button from 'semantic-ui-react/dist/commonjs/elements/Button';
import Header from 'semantic-ui-react/dist/commonjs/elements/Header';
import Image from 'semantic-ui-react/dist/commonjs/elements/Image';
import Loader from 'semantic-ui-react/dist/commonjs/elements/Loader';

import { Input, TransferModal } from '@polkadot/react-components';
import { useBalance, useDecoder, useMarketplaceStages, useSchema } from '@polkadot/react-hooks';
import { KUSAMA_DECIMALS } from '@polkadot/react-hooks/utils';
import { TypeRegistry } from '@polkadot/types';

import arrowLeft from './arrowLeft.svg';
import BuySteps from './BuySteps';
import SaleSteps from './SaleSteps';
import SetPriceModal from './SetPriceModal';

interface NftDetailsProps {
  account: string;
  localRegistry?: TypeRegistry;
  setShouldUpdateTokens?: (collectionId: string) => void;
}

function NftDetails ({ account, localRegistry, setShouldUpdateTokens }: NftDetailsProps): React.ReactElement<NftDetailsProps> {
  const query = new URLSearchParams(useLocation().search);
  const tokenId = query.get('tokenId') || '';
  const collectionId = query.get('collectionId') || '';
  const [readyToWithdraw, setReadyToWithdraw] = useState<boolean>(false);
  const [showTransferForm, setShowTransferForm] = useState<boolean>(false);
  const { balance } = useBalance(account);
  const { hex2a } = useDecoder();
  const { attributes, collectionInfo, reFungibleBalance, tokenUrl } = useSchema(account, collectionId, tokenId, localRegistry);
  const [tokenPriceForSale, setTokenPriceForSale] = useState<string>('');
  const { buyFee, cancelStep, deposited, escrowAddress, formatKsmBalance, kusamaBalance, readyToAskPrice, saleFee, sendCurrentUserAction, setPrice, setReadyToAskPrice, setWithdrawAmount, tokenAsk, tokenInfo, transferStep, withdrawAmount } = useMarketplaceStages(account, collectionInfo, tokenId);

  const uOwnIt = tokenInfo?.Owner?.toString() === account || (tokenAsk && tokenAsk.owner === account);
  const uSellIt = tokenAsk && tokenAsk.owner === account;
  const lowBalanceToBuy = !!(buyFee && !balance?.free.gte(buyFee));
  const lowKsmBalanceToBuy = tokenAsk?.price && kusamaBalance?.free.add(deposited || new BN(0)).lte(tokenAsk.price);
  const lowBalanceToSell = !!(saleFee && !balance?.free.gte(saleFee));

  const goBack = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setShouldUpdateTokens && setShouldUpdateTokens('all');
    history.back();
  }, [setShouldUpdateTokens]);

  const onSavePrice = useCallback(() => {
    if (tokenPriceForSale && ((parseFloat(tokenPriceForSale) < 0.01) || (parseFloat(tokenPriceForSale) > 100000))) {
      alert(`Sorry, price should be in the range between 0.01 and 100000 KSM. You have input: ${tokenPriceForSale}`);

      return;
    }

    setPrice((parseFloat(tokenPriceForSale) * Math.pow(10, KUSAMA_DECIMALS)).toString());
  }, [setPrice, tokenPriceForSale]);

  const onTransferSuccess = useCallback(() => {
    setShowTransferForm(false);
    sendCurrentUserAction('UPDATE_TOKEN_STATE');
    setShouldUpdateTokens && setShouldUpdateTokens(collectionId);
  }, [collectionId, sendCurrentUserAction, setShouldUpdateTokens]);

  const onConfirmWithdraw = useCallback(() => {
    sendCurrentUserAction('REVERT_UNUSED_MONEY');
    setReadyToWithdraw(false);
  }, [sendCurrentUserAction]);

  console.log('deposited', parseFloat(formatKsmBalance(deposited)));

  const showMarketActions = false;

  return (
    <div className='toke-details'>
      <Header as='h1'>
        { attributes && attributes.NameStr && (
          <span>
            {attributes.NameStr} - {tokenId}
          </span>
        )}
        { (!attributes || !attributes.NameStr) && (
          <span>
            {tokenId}
          </span>
        )}
      </Header>
      <a
        className='go-back'
        href='/'
        onClick={goBack}
      >
        <Image
          className='go-back'
          src={arrowLeft}
        />
        back
      </a>
      <Grid className='token-info'>
        { (!collectionInfo || !kusamaBalance || !balance) && (
          <Loader
            active
            inline='centered'
          />
        )}
        <Grid.Row>
          <Grid.Column width={8}>
            { collectionInfo && (
              <Image
                className='token-image'
                src={tokenUrl}
              />
            )}
          </Grid.Column>
          <Grid.Column width={8}>
            <Header as='h3'>
              {collectionInfo && <span>{hex2a(collectionInfo.TokenPrefix)}</span>} #{tokenId}
            </Header>
            { attributes && Object.values(attributes).length > 0 && (
              <div className='accessories'>
                Attributes:
                {Object.keys(attributes).map((attrKey) => (<p key={attrKey}>{attrKey}: {attributes[attrKey]}</p>))}
              </div>
            )}
            { (tokenAsk && tokenAsk.price) && (
              <>
                <Header as={'h2'}>
                  {formatKsmBalance(tokenAsk.price.add(tokenAsk.price.muln(2).divRound(new BN(100))))} KSM
                </Header>
                <p>Fee: {formatKsmBalance(tokenAsk.price.muln(2).divRound(new BN(100)))} KSM, Price: {formatKsmBalance(tokenAsk.price)} KSM</p>
                { uOwnIt && !uSellIt && lowBalanceToSell && (
                  <div className='warning-block'>Your balance is too low to pay fees. <a href='https://t.me/unique2faucetbot'
                    rel='noreferrer nooperer'
                    target='_blank'>Get testUnq here</a></div>
                )}
                { (!uOwnIt && !transferStep && tokenAsk) && lowBalanceToBuy && (
                  <div className='warning-block'>Your balance is too low to pay fees. <a href='https://t.me/unique2faucetbot'
                    rel='noreferrer nooperer'
                    target='_blank'>Get testUnq here</a></div>
                )}
                { (!uOwnIt && !transferStep && tokenAsk) && lowKsmBalanceToBuy && (
                  <div className='warning-block'>Your balance is too low to buy</div>
                )}
              </>
            )}
            <div className='divider' />
            { (uOwnIt && !uSellIt) && (
              <Header as='h4'>You own it!</Header>
            )}
            { uSellIt && (
              <Header as='h4'>You selling it!</Header>
            )}
            { (!uOwnIt && tokenInfo && tokenInfo && tokenInfo.Owner && tokenInfo.Owner.toString() === escrowAddress && !tokenAsk?.owner) && (
              <Header as='h5'>The owner is Escrow</Header>
            )}

            { (!uOwnIt && tokenInfo && tokenInfo && tokenInfo.Owner && tokenInfo.Owner.toString() !== escrowAddress && !tokenAsk?.owner) && (
              <Header as='h5'>The owner is {tokenInfo?.Owner?.toString()}</Header>
            )}

            { (!uOwnIt && tokenInfo && tokenInfo && tokenInfo.Owner && tokenInfo.Owner.toString() === escrowAddress && tokenAsk?.owner) && (
              <Header as='h5'>The owner is {tokenAsk?.owner.toString()}</Header>
            )}

            <div className='buttons'>
              { (uOwnIt && !uSellIt) && (
                <Button
                  content='Transfer'
                  onClick={setShowTransferForm.bind(null, !showTransferForm)}
                />
              )}
              { showMarketActions && (
                <>
                  { (!uOwnIt && !transferStep && tokenAsk) && (
                    <Button
                      content={`Buy it - ${formatKsmBalance(tokenAsk.price.add(tokenAsk.price.muln(2).divRound(new BN(100))))} KSM`}
                      disabled={lowBalanceToBuy || lowKsmBalanceToBuy}
                      onClick={sendCurrentUserAction.bind(null, 'BUY')}
                    />
                  )}
                  { (parseFloat(formatKsmBalance(deposited)) > 0) && (
                    <Button
                      content='Withdraw ksm deposit'
                      onClick={setReadyToWithdraw.bind(null, !readyToWithdraw)}
                    />
                  )}
                  { (uOwnIt && !uSellIt) && (
                    <Button
                      content='Sell'
                      disabled={lowBalanceToSell}
                      onClick={sendCurrentUserAction.bind(null, 'SELL')}
                    />
                  )}
                  { (uSellIt && !transferStep) && (
                    <Button
                      content={
                        <>
                          Delist
                          { cancelStep && (
                            <Loader
                              active
                              inline='centered'
                            />
                          )}
                        </>
                      }
                      onClick={sendCurrentUserAction.bind(null, 'CANCEL')}
                    />
                  )}
                </>
              )}
            </div>

            { (showTransferForm && collectionInfo) && (
              <TransferModal
                account={account}
                balance={reFungibleBalance}
                closeModal={setShowTransferForm.bind(null, false)}
                collection={collectionInfo}
                tokenId={tokenId}
                updateTokens={onTransferSuccess}
              />
            )}
            { !!(transferStep && transferStep <= 3) && (
              <SaleSteps step={transferStep} />
            )}
            { !!(transferStep && transferStep >= 4) && (
              <BuySteps step={transferStep - 3} />
            )}
            { readyToWithdraw && (
              <Form className='transfer-form'>
                <Form.Field>
                  <Input
                    autoFocus
                    className='isSmall'
                    defaultValue={(withdrawAmount || 0).toString()}
                    isError={!!(!deposited || (withdrawAmount && parseFloat(withdrawAmount) > parseFloat(formatKsmBalance(deposited))))}
                    label={'amount'}
                    max={parseFloat(formatKsmBalance(deposited))}
                    onChange={setWithdrawAmount}
                    type='number'
                    value={withdrawAmount}
                  />
                </Form.Field>
                <Form.Field>
                  <div className='buttons'>
                    <Button
                      content={`Withdraw max ${formatKsmBalance(deposited)}`}
                      onClick={deposited ? setWithdrawAmount.bind(null, formatKsmBalance(deposited)) : () => null}
                    />
                    <Button
                      content='confirm withdraw'
                      disabled={!deposited || !parseFloat(withdrawAmount) || (parseFloat(withdrawAmount) > parseFloat(formatKsmBalance(deposited)))}
                      onClick={onConfirmWithdraw}
                    />
                  </div>
                </Form.Field>
              </Form>
            )}
          </Grid.Column>
        </Grid.Row>
      </Grid>
      { readyToAskPrice && (
        <SetPriceModal
          closeModal={setReadyToAskPrice.bind(null, false)}
          onSavePrice={onSavePrice}
          setTokenPriceForSale={setTokenPriceForSale}
          tokenPriceForSale={tokenPriceForSale}
        />
      )}
    </div>
  );
}

export default React.memo(NftDetails);
