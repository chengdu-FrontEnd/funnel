/**
 * Created by T430i on 2016/1/13.
 */
var option = {
    chart: {
        height: 600,
        colors: ['#4576b4', '#4576b4', '#4576b4', '#4576b4', '#4576b4', '#4576b4', '#4576b4', '#4576b4', '#4576b4', '#4576b4']
    },
    curve: {
        enable: true,
        height: 15
    },
    gap: {
        enable: true,
        height: 30
    },
    specification: {
        enable: false,
        spaceWidth:10
    }
};
var data = [['首页',1319],['dingdan',788],['xxx',643],['www',201],['zzz',60],['zdzz',10],['uuu',0]];
var funnelModule = nuoke;
var funnelChart = new funnelModule.GsFunnel(document.getElementById('funnel'));
funnelChart.draw(data, option);
