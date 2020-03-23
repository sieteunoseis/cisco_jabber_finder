const nlp = require('compromise')
var util = require("util");
var axlModule = require('cisco-axl-rest-perfmon');
const ObjectsToCsv = require('objects-to-csv');
var Promise = require('bluebird');
var Bottleneck = require("bottleneck")
require('events').EventEmitter.defaultMaxListeners = 15;

const limiter = new Bottleneck({
	maxConcurrent: 1,
	minTime: 40000
});

var username = process.env.AXL_USERNAME;
var password = process.env.AXL_PASSWORD;
var ipaddr = process.env.AXL_IP;

(async () => {

	// Let verify that AXL is reachable and creds are correct before continuing
	const service = axlModule('12.0', ipaddr, username, password);
	
	// Let's get a count of the query back from CUCM
	SQLCOUNT = 'select count(eu.userid) from device as d inner join devicenumplanmap as dnpm on dnpm.fkdevice = d.pkid inner join enduserdevicemap as eudm on eudm.fkdevice=d.pkid inner join enduser as eu on eudm.fkenduser=eu.pkid inner join numplan as n on dnpm.fknumplan = n.pkid inner join routepartition as rp on n.fkroutepartition=rp.pkid and d.tkclass = 1 and d.tkmodel != 503 and dnpm.numplanindex = 1'
	
	let sqlCount = await service.getSqlOutput(SQLCOUNT).catch(err => {
		console.log("Please verify AXL settings! " + err);
		process.exit(1) //mandatory (as per the Node docs)
	}).then(async result => {
		console.log('Found: ' + result[0] + ' results. Processing....')
		// Arrays to save for CSV output
		var returnArr = []
		var failedArr = []
		// Let's step array starting at 500 and stepping by 500 until the count returned earlier 
		let start = 500
		let step = 500
		// Create array of steps
		let stepArr = range(start,result,step)
		// Array to hold the SQL statements
		let sqlArr = []
		
		// Loop thru at 500 intervals
		stepArr.forEach(value => {
				// Build SQL statement
				SQL = 'select %s d.name, eu.userid, d.description, dnpm.display, n.dnorpattern as DN, rp.name as partition from device as d inner join devicenumplanmap as dnpm on dnpm.fkdevice = d.pkid inner join enduserdevicemap as eudm on eudm.fkdevice=d.pkid inner join enduser as eu on eudm.fkenduser=eu.pkid inner join numplan as n on dnpm.fknumplan = n.pkid inner join routepartition as rp on n.fkroutepartition=rp.pkid and d.tkclass = 1 and d.tkmodel != 503 and dnpm.numplanindex = 1'
			
				if (value < start + 1){
					sqlArr.push(util.format(SQL, 'first ' + value))
					sqlArr.push(util.format(SQL, 'skip ' + value + ' first ' + step))
				}else {
					sqlArr.push(util.format(SQL, 'skip ' + value + ' first ' + step))
				}
		});


		var sqlOutput = await limiter.schedule(() => {
			const allTasks = sqlArr.map(async (x,index) => {
				var sqlout = await service.getSqlOutput(x).catch(err => {
					console.log(err);
				})
				
				return sqlout
			});
			// GOOD, we wait until all tasks are done.
			return Promise.all(allTasks);
		});
			
		// Flatten our array
		sqlOutput = sqlOutput.flat()
		
		sqlOutput.forEach(element => { 
			try{
				let str = element.display
						
				let doc = nlp(str)
				let arr = doc.people()
			
				if (arr.text() && arr['list'][0].length){
					returnArr.push(element)
				}else{
					failedArr.push(element)
				}
			}
			catch (e){
				console.log(e)				
			}
			
		});
			
		
		const csv = new ObjectsToCsv(returnArr);
		const failed = new ObjectsToCsv(failedArr);
		 
		// Save to file:
		await csv.toDisk('./people.csv');
		console.log('Wrote to people.csv')
		await failed.toDisk('./failed.csv');
		console.log('Wrote to failed.csv')
	});

		
})();

function range(start, stop, step){
	if (typeof stop=='undefined'){
		// one param defined
		stop = start;
		start = 0;
	};
	if (typeof step=='undefined'){
		step = 1;
	};
	var result = [];
	for (var i=start; step>0 ? i<stop : i>stop; i+=step){
		result.push(i);
	};
	return result;
};



