if (typeof Renderers === "undefined") {
  var Renderers = (function() {
    return { // 이곳에 등록하세요 value: td 값, object: tr 값
      countRender: function(value, object) {
        if (value == undefined) {
          return "";
        } else if (value < 1) {
          return "-";
        }

        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      , timeItemRender: function(value, object) {
          const valueDate = new Date(value);
          const calcDate = new Date(value - (valueDate.getTimezoneOffset() * 60 * 1000));

          const strs = calcDate.toISOString().split("T");
          return strs[0] + " " + strs[1].substring(0, 8);
      }
      , linkRender: function(value, object) {
        var style = "style='font-size:1em;'";
        var strHtml = "<a href='/monitor/cswitch_view.do?id=" + object.cswitch_id + "' " + style + ">" + replaceTag(object.cswitch_name) + "</a>";
        if (tiCommon.isPopup()) {
          strHtml = "<a href='/popup/monitor/cswitch_view.do?org_id=" + watch_object.org_id + "&net_id=" + watch_object.net_id + "&id=" + object.cswitch_id  + "' " + style + ">" + replaceTag(object.cswitch_name) + "</a>";
        }
        return strHtml;
      }
      , checkbox: function(value, object, column) {
        const $input = document.createElement("input");
        $input.type = "checkbox";
        $input.addEventListener("change", function(e) {
          column.emit("gridColumn-checkbox-change", e.target);
        });

        return $input;
      }
      , number: function(value, object, column) {
        return object.grid_index + 1;
      }
    }
  })();
} else {
  console.error("namespace duplication!!! - Renderers");
}