const nlp = require('compromise')

str = 'John Fitzgerald Kennedy (May 29, 1917 – November 22, 1963), often referred to by the initials JFK and Jack, was an American politician who served as the 35th President of the United States from January 1961 until his assassination in November 1963. Kennedy served at the height of the Cold War, and the majority of his work as president concerned relations with the Soviet Union and Cuba. A Democrat, Kennedy represented Massachusetts in the U.S. House of Representatives and Senate prior to becoming president.'

let doc = nlp(str)
let arr = doc.people()

console.log(arr.json())

if (arr.text()){
	console.log(arr.text())	
}else{
	console.log('Proper Name not found')
}