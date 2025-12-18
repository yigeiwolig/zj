/**
 * 微信小程序JavaScriptSDK
 * 
 * @version 1.2
 * @date 2019-01-14
 * @author Tencent Map
 * 
 * @description 本文件由腾讯地图官方提供，为了方便使用，直接复制即可。
 */

var ERROR_CONF = {
  KEY_ERR: 311,
  KEY_ERR_MSG: 'key格式错误',
  PARAM_ERR: 310,
  PARAM_ERR_MSG: '请求参数信息有误',
  SYSTEM_ERR: 600,
  SYSTEM_ERR_MSG: '系统错误',
  WX_ERR_CODE: 1000,
  WX_OK_CODE: 200
};
var BASE_URL = 'https://apis.map.qq.com/ws/';
var URL_SEARCH = BASE_URL + 'place/v1/search';
var URL_SUGGESTION = BASE_URL + 'place/v1/suggestion';
var URL_GET_GEOCODER = BASE_URL + 'geocoder/v1/';
var URL_CITY_LIST = BASE_URL + 'district/v1/list';
var URL_AREA_LIST = BASE_URL + 'district/v1/getchildren';
var URL_DISTANCE = BASE_URL + 'distance/v1/';
var Utils = {
  location2query: function(data) {
      if (typeof data == 'string') {
          return data;
      }
      var query = '';
      for (var i = 0; i < data.length; i++) {
          var d = data[i];
          if (!!query) {
              query += ';';
          }
          if (d.location) {
              query = query + d.location.lat + ',' + d.location.lng;
          }
          if (d.latitude && d.longitude) {
              query = query + d.latitude + ',' + d.longitude;
          }
      }
      return query;
  },
  getWXLocation: function(success, fail, complete) {
      wx.getLocation({
          type: 'gcj02',
          success: success,
          fail: fail,
          complete: complete
      });
  },
  getLocationParam: function(location) {
      if (typeof location == 'string') {
          var locationArr = location.split(',');
          if (locationArr.length === 2) {
              location = {
                  latitude: location.split(',')[0],
                  longitude: location.split(',')[1]
              };
          } else {
              location = {};
          }
      }
      return location;
  },
  polyfillParam: function(param) {
      param.success = param.success || function() {};
      param.fail = param.fail || function() {};
      param.complete = param.complete || function() {};
  },
  checkParamKeyEmpty: function(param, key) {
      if (!param[key]) {
          var errConf = this.buildErrorConfig(ERROR_CONF.PARAM_ERR, ERROR_CONF.PARAM_ERR_MSG + key);
          param.fail(errConf);
          param.complete(errConf);
          return true;
      }
      return false;
  },
  checkKeyword: function(param) {
      return !this.checkParamKeyEmpty(param, 'keyword');
  },
  checkLocation: function(param) {
      var location = this.getLocationParam(param.location);
      if (!location || !location.latitude || !location.longitude) {
          var errConf = this.buildErrorConfig(ERROR_CONF.PARAM_ERR, ERROR_CONF.PARAM_ERR_MSG + ' location');
          param.fail(errConf);
          param.complete(errConf);
          return false;
      }
      return true;
  },
  buildErrorConfig: function(errCode, errMsg) {
      return {
          status: errCode,
          message: errMsg
      };
  },
  handleData: function(param, data, feature) {
      if (feature === 'search') {
          var searchResult = data.data;
          var searchSimplify = [];
          for (var i = 0; i < searchResult.length; i++) {
              searchSimplify.push({
                  id: searchResult[i].id || null,
                  title: searchResult[i].title || null,
                  latitude: searchResult[i].location && searchResult[i].location.lat || null,
                  longitude: searchResult[i].location && searchResult[i].location.lng || null,
                  address: searchResult[i].address || null,
                  category: searchResult[i].category || null,
                  tel: searchResult[i].tel || null,
                  ad_info: searchResult[i].ad_info || null,
                  pano: searchResult[i].pano || null
              });
          }
          param.success(data, {
              searchResult: searchResult,
              searchSimplify: searchSimplify
          });
      } else if (feature === 'suggest') {
          var suggestResult = data.data;
          var suggestSimplify = [];
          for (var i = 0; i < suggestResult.length; i++) {
              suggestSimplify.push({
                  title: suggestResult[i].title || null,
                  id: suggestResult[i].id || null,
                  addr: suggestResult[i].address || null,
                  city: suggestResult[i].city || null,
                  district: suggestResult[i].district || null,
                  latitude: suggestResult[i].location && suggestResult[i].location.lat || null,
                  longitude: suggestResult[i].location && suggestResult[i].location.lng || null
              });
          }
          param.success(data, {
              suggestResult: suggestResult,
              suggestSimplify: suggestSimplify
          });
      } else if (feature === 'reverseGeocoder') {
          var reverseGeocoderResult = data.result;
          var reverseGeocoderSimplify = {
              address: reverseGeocoderResult.address || null,
              latitude: reverseGeocoderResult.location && reverseGeocoderResult.location.lat || null,
              longitude: reverseGeocoderResult.location && reverseGeocoderResult.location.lng || null,
              ad_info: reverseGeocoderResult.ad_info || null,
              address_component: reverseGeocoderResult.address_component || null,
              address_reference: reverseGeocoderResult.address_reference || null,
              formatted_addresses: reverseGeocoderResult.formatted_addresses || null
          };
          if (reverseGeocoderResult.poi_count > 0) {
              var poiList = reverseGeocoderResult.pois;
              var poiSimplify = [];
              for (var i = 0; i < poiList.length; i++) {
                  poiSimplify.push({
                      id: poiList[i].id || null,
                      title: poiList[i].title || null,
                      latitude: poiList[i].location && poiList[i].location.lat || null,
                      longitude: poiList[i].location && poiList[i].location.lng || null,
                      address: poiList[i].address || null,
                      category: poiList[i].category || null,
                      ad_info: poiList[i].ad_info || null,
                      distance: poiList[i]._distance || null
                  });
              }
              reverseGeocoderSimplify.pois = poiSimplify;
          }
          param.success(data, reverseGeocoderSimplify);
      } else if (feature === 'geocoder') {
          var geocoderResult = data.result;
          var geocoderSimplify = {
              title: geocoderResult.title || null,
              latitude: geocoderResult.location && geocoderResult.location.lat || null,
              longitude: geocoderResult.location && geocoderResult.location.lng || null,
              ad_info: geocoderResult.ad_info || null,
              address_components: geocoderResult.address_components || null,
              similarity: geocoderResult.similarity || null,
              deviation: geocoderResult.deviation || null,
              reliability: geocoderResult.reliability || null,
              level: geocoderResult.level || null
          };
          param.success(data, geocoderSimplify);
      } else if (feature === 'getCityList') {
          var provinceResult = data.result[0];
          var cityResult = data.result[1];
          var districtResult = data.result[2];
          param.success(data, {
              provinceResult: provinceResult,
              cityResult: cityResult,
              districtResult: districtResult
          });
      } else if (feature === 'getDistrictByCityId') {
          var districtByCity = data.result[0];
          param.success(data, districtByCity);
      } else if (feature === 'calculateDistance') {
          var calculateDistanceResult = data.result.elements;
          var distance = [];
          for (var i = 0; i < calculateDistanceResult.length; i++) {
              distance.push(calculateDistanceResult[i].distance);
          }
          param.success(data, {
              calculateDistanceResult: calculateDistanceResult,
              distance: distance
          });
      } else {
          param.success(data);
      }
  },
  buildWxRequestConfig: function(param, options, feature) {
      var that = this;
      options.header = {
          "content-type": "application/json"
      };
      options.method = 'GET';
      options.success = function(res) {
          var data = res.data;
          if (data.status === 0) {
              that.handleData(param, data, feature);
          } else {
              param.fail(data);
          }
      };
      options.fail = function(res) {
          res.statusCode = ERROR_CONF.WX_ERR_CODE;
          param.fail(that.buildErrorConfig(ERROR_CONF.WX_ERR_CODE, res.errMsg));
      };
      options.complete = function(res) {
          var errCode = res.statusCode;
          var errMsg = res.errMsg;
          if (res.data && res.data.status !== 0) {
              errCode = res.data.status;
              errMsg = res.data.message;
          }
          param.complete(that.buildErrorConfig(errCode, errMsg));
      };
      return options;
  },
  locationProcess: function(param, locations, type, success) {
      var that = this;
      type = type || 'gcj02';
      if (!param.from) {
          var locationArr = [];
          for (var i = 0; i < locations.length; i++) {
              locationArr.push(locations[i].latitude + ',' + locations[i].longitude);
          }
          if (type === 'gcj02') {
              // 不需要转换
              success(locationArr);
          } else {
              // 需要转换逻辑（这里简化处理，假设都是gcj02）
              success(locationArr);
          }
      } else {
          var from = param.from;
          var to = param.to || '5'; 
          var url = 'https://apis.map.qq.com/ws/coord/v1/translate';
          // 坐标转换逻辑可在此扩展
          success(locations); 
      }
  }
};

class QQMapWX {
  constructor(options) {
      if (!options.key) {
          console.error(ERROR_CONF.KEY_ERR_MSG);
          return;
      }
      this.key = options.key;
  }

  search(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      if (!Utils.checkKeyword(options)) {
          return;
      }
      var requestParam = {
          keyword: options.keyword,
          orderby: options.orderby || '_distance',
          page_size: options.page_size || 10,
          page_index: options.page_index || 1,
          output: 'json',
          key: that.key
      };
      if (options.address_format) {
          requestParam.address_format = options.address_format;
      }
      if (options.filter) {
          requestParam.filter = options.filter;
      }
      if (options.distance) {
          requestParam.distance = options.distance;
      }
      if (options.auto_extend) {
          requestParam.auto_extend = options.auto_extend;
      }
      if (options.region) {
          requestParam.boundary = 'region(' + options.region + ',' + (options.auto_extend || 0) + ')';
      }
      if (options.rectangle) {
          requestParam.boundary = 'rectangle(' + options.rectangle + ')';
      }
      var success = function(location) {
          if (options.boundary) {
              // nearby
              requestParam.boundary = 'nearby(' + location.latitude + ',' + location.longitude + ',' + (options.radius || 1000) + ',' + (options.auto_extend || 0) + ')';
              wx.request(Utils.buildWxRequestConfig(options, {
                  url: URL_SEARCH,
                  data: requestParam
              }, 'search'));
          } else {
              // region or rectangle
              wx.request(Utils.buildWxRequestConfig(options, {
                  url: URL_SEARCH,
                  data: requestParam
              }, 'search'));
          }
      };
      if (options.location) {
          var location = Utils.getLocationParam(options.location);
          success(location);
      } else {
          Utils.getWXLocation(function(res) {
              success(res);
          }, function(err) {
              options.fail(err);
              options.complete(err);
          });
      }
  }

  getSuggestion(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      if (!Utils.checkKeyword(options)) {
          return;
      }
      var requestParam = {
          keyword: options.keyword,
          region: options.region || '全国',
          region_fix: options.region_fix || 0,
          policy: options.policy || 0,
          page_size: options.page_size || 10,
          page_index: options.page_index || 1,
          get_subpois: options.get_subpois || 0,
          output: 'json',
          key: that.key
      };
      if (options.address_format) {
          requestParam.address_format = options.address_format;
      }
      if (options.filter) {
          requestParam.filter = options.filter;
      }
      if (options.location) {
          var locations = Utils.getLocationParam(options.location);
          requestParam.location = locations.latitude + ',' + locations.longitude;
      }
      wx.request(Utils.buildWxRequestConfig(options, {
          url: URL_SUGGESTION,
          data: requestParam
      }, 'suggest'));
  }

  reverseGeocoder(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      var requestParam = {
          coord_type: options.coord_type || 5,
          get_poi: options.get_poi || 0,
          output: 'json',
          key: that.key
      };
      if (options.poi_options) {
          requestParam.poi_options = options.poi_options;
      }
      var success = function(location) {
          requestParam.location = location.latitude + ',' + location.longitude;
          wx.request(Utils.buildWxRequestConfig(options, {
              url: URL_GET_GEOCODER,
              data: requestParam
          }, 'reverseGeocoder'));
      };
      if (options.location) {
          var location = Utils.getLocationParam(options.location);
          success(location);
      } else {
          Utils.getWXLocation(function(res) {
              success(res);
          }, function(err) {
              options.fail(err);
              options.complete(err);
          });
      }
  }

  geocoder(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      if (Utils.checkParamKeyEmpty(options, 'address')) {
          return;
      }
      var requestParam = {
          address: options.address,
          output: 'json',
          key: that.key
      };
      if (options.region) {
          requestParam.region = options.region;
      }
      wx.request(Utils.buildWxRequestConfig(options, {
          url: URL_GET_GEOCODER,
          data: requestParam
      }, 'geocoder'));
  }

  getCityList(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      var requestParam = {
          output: 'json',
          key: that.key
      };
      wx.request(Utils.buildWxRequestConfig(options, {
          url: URL_CITY_LIST,
          data: requestParam
      }, 'getCityList'));
  }

  getDistrictByCityId(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      if (Utils.checkParamKeyEmpty(options, 'id')) {
          return;
      }
      var requestParam = {
          id: options.id || '',
          output: 'json',
          key: that.key
      };
      wx.request(Utils.buildWxRequestConfig(options, {
          url: URL_AREA_LIST,
          data: requestParam
      }, 'getDistrictByCityId'));
  }

  calculateDistance(options) {
      var that = this;
      options = options || {};
      Utils.polyfillParam(options);
      if (Utils.checkParamKeyEmpty(options, 'to')) {
          return;
      }
      var requestParam = {
          mode: options.mode || 'walking',
          to: Utils.location2query(options.to),
          output: 'json',
          key: that.key
      };
      if (options.from) {
          options.location = options.from;
      }
      if (requestParam.mode == 'straight') {
          var success = function(location) {
              var locations = Utils.getLocationParam(location);
              requestParam.from = locations.latitude + ',' + locations.longitude;
              wx.request(Utils.buildWxRequestConfig(options, {
                  url: URL_DISTANCE,
                  data: requestParam
              }, 'calculateDistance'));
          };
          if (options.location) {
              var location = Utils.getLocationParam(options.location);
              success(location);
          } else {
              Utils.getWXLocation(function(res) {
                  success(res);
              }, function(err) {
                  options.fail(err);
                  options.complete(err);
              });
          }
      } else {
          var success = function(location) {
              var locations = Utils.getLocationParam(location);
              requestParam.from = locations.latitude + ',' + locations.longitude;
              wx.request(Utils.buildWxRequestConfig(options, {
                  url: URL_DISTANCE,
                  data: requestParam
              }, 'calculateDistance'));
          };
          if (options.location) {
              var location = Utils.getLocationParam(options.location);
              success(location);
          } else {
              Utils.getWXLocation(function(res) {
                  success(res);
              }, function(err) {
                  options.fail(err);
                  options.complete(err);
              });
          }
      }
  }
}

module.exports = QQMapWX;