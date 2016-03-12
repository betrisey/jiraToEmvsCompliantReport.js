var config = require('./config');

const https = require('https');
const moment = require('moment');
const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const cloudconvert = new (require('cloudconvert'))(config.login.cloudconvertKey);

// Dates
var lastMonday = moment();
while (lastMonday.day() !== 1) {
    lastMonday.subtract(1, 'd');
}
var lastFriday = moment(lastMonday);
while (lastFriday.day() !== 5) {
    lastFriday.add(1, 'd');
}

config.info.week = lastMonday.format('DD.MM.YYYY') + ' - ' + lastFriday.format('DD.MM.YYYY');
config.info.lastFriday = lastFriday.format('DD.MM.YYYY');
config.info.name = config.info.firstname + ' ' + config.info.lastname;
config.info.filename = config.info.lastname + '_' + config.info.firstname + '_journal_' + lastFriday.format('YYYY MM YY') + '_' + config.info.company;

var filter = '?startDate='+lastMonday.format('YYYY-MM-DD')+'&endDate='+lastFriday.format('YYYY-MM-DD');

var httpOptions = {
    host: config.login.server,
    port: 443,
    path: '/rest/timesheet-gadget/1.0/raw-timesheet.json' + filter,
    method: 'GET',
    auth: config.login.username+':'+config.login.password
};

var req = https.request(httpOptions, (res) => {
    if (res.statusCode != 200) {
        console.error('Error while fetching the timesheet from Jira');
        console.log('HTTP '+res.statusCode);
    }
    
    var data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        toDocx(JSON.parse(data));
    });
});
req.end();

req.on('error', (e) => {
    console.error(e);
});

var toDocx = function(timesheet) {
    var template = fs.readFileSync(__dirname + '/template.docx', 'binary');
    var doc = new Docxtemplater(template);
    
    var tasks = [];
    
    timesheet.worklog.forEach(function(task) {
        task.entries.forEach(function(entry) {
            var duration = moment.duration(entry.timeSpent*1000);
            
            tasks.push({
                date: moment(entry.startDate).format('DD.MM.YYYY'),
                title: task.key.substr(0, task.key.indexOf('-')) + ' : ' + task.summary,
                description: entry.comment,
                //duration: moment.duration(entry.timeSpent*1000).humanize(),
                duration: Math.floor(duration.asHours()) + 'h' + moment.utc(duration.asMilliseconds()).format("mm"),
                responsible: config.info.companyResponsible,
                sortIndex: entry.created // Date et heure de création
            });
        });
    });
    
    config.recurringTasks.forEach(function(task) {
        var date = moment(lastMonday).add(task.day - 1, 'd');
        tasks.push({
            date: date.format('DD.MM.YYYY'),
            title: task.title,
            description: task.description,
            duration: task.duration,
            responsible: '',
            sortIndex: date.format('x')
        });
    });
    
    config.info.tasks = tasks.sort((a, b) => a.sortIndex - b.sortIndex);
    
    doc.setData(config.info);
    
    doc.render();
    
    var buf = doc.getZip().generate({type: 'nodebuffer'});
    
    fs.writeFileSync(__dirname + '/' + config.info.filename + '.docx', buf);
    console.log('"'+config.info.filename + '.docx" generated');
    
    fs.createReadStream(__dirname + '/' + config.info.filename + '.docx')
        .pipe(cloudconvert.convert({
            inputformat: 'docx',
            outputformat: 'pdf'
        }))
        .pipe(fs.createWriteStream(__dirname + '/' + config.info.filename + '.pdf'))
        .on('finish', function() {
            console.log('"' + config.info.filename + '.pdf" generated');
            process.exit();
        });
}