//index.js
//获取应用实例
var constant = require('../../common/js/constant');
var wxService = require('../../common/js/wx');
var us = require('../../lib/underscore');


var app = getApp();
Page({
  data: {
    userInfo: {}
  },
  //事件处理函数
  goPay: function() {
    pay.getPaymentInfo(function(data){
      if(data.data.code==="0000"){
        pay.doPay(data.data);
      }else{
        wx.showModal({
          title:"错误",
          content:data.data.errMsg||"准备支付出现问题，请稍后再试",
          showCancel:false
        });
      }
    });
  },
  onLoad: function () {
    console.log('onLoad');
    user.getUserInfo(function(userInfo){//得到用户的信息
      console.log(userInfo);
      _fn.render({userInfo:userInfo});//将用户信息展示在页面上
    });
  }
});
var _fn = {
  render:function(data){
    us.last(getCurrentPages()).setData(data);
  },
  checkAjaxRes:function(result){
      if(result.statusCode===200){//请求成功
        var resData = result.data;
        return resData;
      }else{//请求失败
        wx.showModal({
          title:'错误',
          content:'网络出错啦',
          showCancel:false
        });

      }
  }
};
var pay = {
  getPaymentInfo:function(callBack){
    var url = constant.host + constant.path.getPaymentInfo;
    user.wxUserRequest({
      url:url,
      data:{}
    },function(data){
      if(data.code==="0000"){
        if(typeof callBack === 'function'){
          console.log(data);
          callBack(data.data);
        }
      }else{
        wx.showModal({
          title:'错误',
          content:data.errMsg||"获取往支付信息失败",
          showCancel:false
        })
      }
    });
  },
  doPay:function(data){
    wx.requestPayment({
      timeStamp:new Date().getTime(),
      nonceStr:"aabbccdd",
      package:"我不知道",
      signType:"MD5",
      paySign:"",
      success:function(){
        console.log(arguments);

      },
      fail:function(){
        console.log(arguments);

      }

    });
  }
};
var weixin = {
  getWxUserInfo:function(callBack){
    wx.getUserInfo({
      complete:function(data){
        if(callBack&&typeof callBack==='function'){
          callBack(data);
        }
      }

    });
  },
  doWxLogin:function(callBack){
    wx.login({
      complete:function(data){
        if(data.errMsg==="login:ok"){
          if(callBack && typeof callBack === 'function'){
            callBack(data);
          }
        }
      }
    });
  },
  getSessionId:function(callBack){
    var sessionId = wxService.getStorage('sessionId');
    if(sessionId&&sessionId.length>0){
      if(typeof callBack === 'function'){
        callBack(sessionId);
      }
    }else{
        weixin.doWxLogin(function(wxLoginRes){//微信登录
          weixin.getWxUserInfo(function(wxUserInfo){//获取微信用户的信息
            var param = {
              code:wxLoginRes.code,
              iv:wxUserInfo.iv,
              signature:wxUserInfo.signature,
              rawData:wxUserInfo.rawData,
              encryptedData:wxUserInfo.encryptedData,
            };
            param = us.extend(param,wxUserInfo.userInfo);
            console.log("param",param);
            var url = constant.host + constant.path.getSessionId;
            wx.request({
              url:url,
              data:param,
              complete:function(data){
                console.log(data);
                wxService.setStorage('sessionId',data.data.sessionId);
                weixin.getSessionId(callBack);
              }
            });//end wx.request
          });//end weixin.getWxUserInfo
        });//end weixin.doWxLogin
      }
  },
  checkWxSession:function(loginCB){
      wx.checkSession({
      success:function(){
        console.log("checklogin success");
        if(loginCB&&typeof loginCB==='function'){
          loginCB();
        }
      },
      fail:function(){
        console.log("checklogin fail");
        user.doLogin(function(){
          user.checkSession(loginCB);
        });
      }
    });
  },
};
var user = {
  getUserInfo:function(callBack){
    var url = constant.host + constant.path.getUserInfo;//后台地址
    user.wxUserRequest({
      url:url
    },function(data){
      if(typeof callBack === 'function'){
        callBack(data.data);
      }
    });
  },
  saveUserInfo:function(userInfo,callBack){
    if(!us.isObject(userInfo)){
      wx.showModal({
        title:"错误",
        content:'用户数据为空',
        showCancel:false
      });
    }else{
      var url = constant.host + constant.path.saveUserInfo;
      user.wxUserRequest({
        url:url,
        data:userInfo,
      },function(result){
        if(typeof callBack === 'function'){
          callBack(result);
        }
      });
    }
  },
  wxUserRequest:function(option,callBack){//封装微信请求
    weixin.getSessionId(function(sessionId){//获取本地登录态
        if(!sessionId){
          wx.showModal({
            title:'错误',
            contetn:'获取用户登录态失败',
            showCancel:false
          });
          return;
        }
        option.data = option.data || {};
        option.data.sessionId = sessionId;//将sessionId与请求参数合并
        wx.request({
          url:option.url,
          data:option.data,
          complete:function(result){
            var resData = _fn.checkAjaxRes(result);//判断请求是否成功
            if(!resData){
              return;
            }
            if(resData.code==='0001'){//未登录或sessionkey不合法
              wxService.setStorage({//清空sessionkey后重新执行。
                key:"sessionId",
                data:null,
                complete:function(){
                  user.wxUserRequest(option,callBack);
                }
              });
            }else{
              if(typeof callBack === 'function'){
                callBack(resData);
              }
            }
          }
        });
    });//end
  }
};
