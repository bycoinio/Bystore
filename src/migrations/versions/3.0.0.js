import accountApi from "@/models/account";
import bytomApi from '@/models/bytom';


export const m3_0_0 = async bytom => {

  const oldAccountList = await accountApi.list();

  if(oldAccountList.length >0){

    for(let oldAccount of oldAccountList){
      if(!bytom.keychain.findByGuid(oldAccount)){
        let account = Object.assign({},oldAccount);
        account.xpub = oldAccount.rootXPub
        delete account['net'];
        delete account['rootXPub'];

        const key = await accountApi.listKeyByXpubOld(account.xpub);
        account.keystore = key.key;
        account.keyAlias = key.alias
        account.vMnemonic = true
        bytom.keychain.pairs[account.alias] = account
      }
    }

    bytom.settings.netType = 'bytom';
    bytomApi.setupNet(`${bytom.settings.net}bytom`)

    delete bytom.accountList
    bytom.currentAccount = bytom.keychain.pairs[oldAccountList[0].alias]
  }

  return true;
};
