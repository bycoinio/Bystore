<style lang="" scoped>
.warp {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 600px;
    z-index: 2;
}
.header {
  display: flex;
}
.header p{
  text-align: center;
  width: 270px;
  padding-top: 17px;
}

.content {
    margin: 20px;
    padding: 20px;
    overflow: hidden;
    border-radius:4px;
    width: 280px;
}

.ft {
    border-radius: 5px;
    padding: 0 20px !important;
    line-height: 45px;
    margin-bottom: 20px;
}

.ft .from {
    overflow-x: hidden;
    width: 90px;
}
.ft .to {
    overflow-x: hidden;
    padding-left: 20px;
    float: right;
}

.right-arrow {
    width: 32px;
    height: 32px;
    border-top: 12px solid #3c454b;
    border-right: 12px solid #3c454b;
    transform: rotate(45deg);
    position: absolute;
    left: 105px;
}

.divider {
    margin: 15px 0;
}

.value .uint {
    font-size: 12px;
    margin-left: 3px;
    text-transform: uppercase;
}

.fee-intro {
    font-size: 10px;
}

.btn-inline {
    display: flex;
    padding: 0;
}
.btn-inline .btn {
    margin: 10px 15px;
}
.row{
  word-break: break-all;
}
  .col{
    font-size: 14px;
    width: 35%;
  }
  .label{
    color: #7B7B7B;
  }
  .value{
    color: #282828;
    width: 60%;
  }
  .asset{
    text-transform: uppercase;
  }
  table{
    width: 100%;
  }
  .form-item{
    padding:0;
    margin:0;
    margin-bottom: 10px;
  }
  .scorll-panel{
    overflow: scroll;
    height: 545px;
  }
.view-link{
  font-size: 14px;
  color: #035BD4;
}
</style>

<template>
    <div class="warp bg-gray">
        <section class="header bg-header">
            <i class="iconfont icon-back" @click="$router.go(-1)"></i>
            <p>{{ title || $t('vote.voteDetials') }}</p>
        </section>

        <div class="scorll-panel">
            <section class="content bg-white">
                <table>
                    <tbody>
                        <tr class="row">
                            <td class="col label">{{ accountLabel }}</td>
                            <td class="col value">{{account.alias}}</td>
                        </tr>
                        <tr v-if="selectVote.name" class="row">
                            <td class="col label">{{ $t('listVote.bpName')}}</td>
                            <td class="col value">{{selectVote.name}}</td>
                        </tr>
                        <tr v-else class="row">
                            <td class="col label">{{ $t('listVote.bpPubkey')}}</td>
                            <td class="col value">{{transaction.toShort}}</td>
                        </tr>
                        <div class="divider"></div>
                        <tr class="row">
                            <td class="col label">{{ $t('listVote.votes') }}</td>
                            <td class="col value">{{transaction.amount}}<span v-if="assetAlias" class="uint">{{assetAlias}}</span></td>
                        </tr>
                        <tr class="row">
                            <td class="col label">{{ $t('transfer.fee') }}</td>
                            <td class="col value">{{transaction.fee}}<span class="uint">BTM</span></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="content bg-white">
              <div class="form">
                <div class="form-item">
                  <label class="form-item-label">{{ $t('transfer.confirmPassword') }}</label>
                  <div class="form-item-content">
                    <input type="password"  v-model="password" autofocus>
                  </div>
                </div>
              </div>
            </section>

            <div class="row" style="margin: 20px;">
                <div class="btn bg-green" @click="transfer">{{ $t('transfer.confirm') }}</div>
            </div>
        </div>

    </div>

</template>

<script>
  import address from "@/utils/address";
  import transaction from "@/models/transaction";
  import BigNumber from "bignumber.js"
  import account from "@/models/account";
import modalPasswd from "@/components/modal-passwd";
import getLang from "@/assets/language/sdk";
import { LocalStream } from 'extension-streams';
import { mapGetters,mapState } from 'vuex'

export default {
    components: {
        modalPasswd
    },
    data() {
        return {
          full: false,
          title:null,
          accountLabel: this.$t('listVote.voteAccount'),
          rawData: {},
            account: {},
            transaction: {
                to: "",
                toShort: "",
                amount: 0,
                fee: ""
            },
            password:'',
            assetAlias:null
        };
    },
  beforeRouteEnter (to, from, next) {
    next(vm => {
      if(from.name === 'veto') {
        vm.title = vm.$t('vote.vetoDetials')
        vm.accountLabel = vm.$t('listVote.vetoAccount')
      }

      next()
    });
  },
  computed: {
      totalAmount(){
        if(this.assetAlias && this.assetAlias.toUpperCase() === 'BTM'){
          const n = new BigNumber(this.transaction.amount)
          return n.plus(this.transaction.fee).toNumber()
        }else{
          return Number(this.transaction.amount)
        }
      },
      ...mapState([
        'selectVote',
        'bytom'
      ]),
      ...mapGetters([
        'language',
        'net'
      ])
    },
    methods: {
        shortAddress: function (add) {
          return address.short(add)
        },
        transfer: function () {
            if (this.password == "") {
              this.$dialog.show({
                body: this.$t("transfer.emptyPassword")
              });
              return;
            }
            let loader = this.$loading.show({
                // Optional parameters
                container: null,
                canCancel: true,
                onCancel: this.onCancel
            });

          Promise.all(this.rawData.map( (rawdata) => transaction.transfer(this.account.guid, rawdata, this.password, this.account.vpAddress, this)))
            .then(ret => {
              loader.hide();
              if(this.$route.params.type == 'popup'){
                LocalStream.send({method:'transfer',action:'success', message:ret[ret.length-1]});
                window.close();
              }
              this.$dialog.show({
                type: 'success',
                body: this.$t("transfer.success")
              });
              this.$router.push('/')
              if(this.transaction.type === 'toVapor'){
                account.setupNet(`${this.net}vapor`)
              }
            })
            .catch(error => {
              loader.hide();
              this.$dialog.show({
                body: getLang(error.message, this.language)
              });
            });
        }
    }, mounted() {
        let params = this.$route.params;

        this.account = params.account;
        this.transaction = params.transaction;
        this.transaction.toShort = params.transaction.to;
        this.rawData = params.rawData;

        this.assetAlias = params.assetAlias;
    }
};
</script>
