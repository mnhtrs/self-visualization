require('dotenv').config();
const Discord = require('discord.js');
const { Client, MessageEmbed } = require('discord.js');
// const moment = require('moment');
const client = new Discord.Client();
client.on('ready', () => {
	console.log('Ready To Getting Member Information!');
	client.user.setActivity('Get All Member Info...');
});
client.on('message', async message => {
	try{
		let fst_infocmdlength = message.content.split(' ').length > 1;
		let fst_infocmdtype = message.content.toLowerCase().startsWith('info');
		if(fst_infocmdlength && fst_infocmdtype && message.content.split('').length >= 4){
			let user = message.mentions.users.first();
			let member = message.guild.member(user);
			let status = user.presence.status;
			if(status === 'dnd') status = '⛔ Do Not Disturb';
			if(status === 'offline') status = '⚫ Offline';
			if(status === 'online') status = '🟢 Online';
			if(status === 'idle') status = '🌙 Idle';
			let id = user.id;let birthday;let favs;let fav_col;let fav_game;let fav_film;let fav_anime;
			let country = ['🇻🇳 Vietnam'];
			let vn_province = ['Ha Noi'];
			let actv = (!user.presence.activities === "CUSTOM_STATUS Custom Status" && user.presence.activities.length >= 1) ? `${user.presence.activities[0].type} ${user.presence.activities[0].name}` : "None";
			let guild = message.guild;
			let nickname = (member.nickname !== undefined && member.nickname !== null) ? member.nickname : "None";
			let mem_cache = message.guild.members.cache.get(id);
			// *** ERROR ***
			// let role_cache = message.guild.roles.cache.get(role.id).members;
			// let hasRole = (role_cache !== undefined && role_cache !== null) ? role_cache.size : "None";
			// let perm_cache = message.member.permissions;
			// let allPerms = (perm_cache !== undefined && perm_cache !== null) ? perm_cache : "None";
			let createdAcc;let joinedSv;
			let createAccMin = Math.floor((Date.now() - user.createdAt)/60000);
			let joinSvMin = Math.floor((Date.now() - mem_cache.joinedAt)/60000);
			let createAccHrs = Math.floor((Date.now() - user.createdAt)/3600000);
			let joinSvHrs = Math.floor((Date.now() - mem_cache.joinedAt)/3600000);
			let createAccDay = Math.floor((Date.now() - user.createdAt)/86400000);
			let joinSvDay = Math.floor((Date.now() - mem_cache.joinedAt)/86400000);
			let createAccMonth = Math.floor((Date.now() - user.createdAt)/2629800000);
			let joinSvMonth = Math.floor((Date.now() - mem_cache.joinedAt)/2629800000);
			let createAccYear = Math.floor((Date.now() - user.createdAt)/31556952000);
			let joinSvYear = Math.floor((Date.now() - mem_cache.joinedAt)/31556952000);
			if(createAccMin >= 1 && createAccMin <= 60) createdAcc = `Since ${createAccMin} minute(s) ago.`;
			if(createAccHrs >= 1 && createAccHrs <= 24) createdAcc = `Since ${createAccMin} minute(s) ago,\n${createAccHrs} hours ago.`;
			if(createAccDay >= 1 && createAccDay <= 30) createdAcc = `Since ${createAccHrs} hours ago,\n${createAccDay} day(s) ago.`;
			if(createAccMonth >= 1 && createAccMonth <= 12) createdAcc = `Since ${createAccDay} day(s) ago,\n${createAccMonth} month(s) ago.`;
			if(createAccYear >= 1) createdAcc = `Since ${createAccMonth} month(s) ago,\n${createAccYear} year(s) ago.`;
			if(joinSvMin >= 1 && joinSvMin <= 60) joinedSv = `Since ${joinSvMin} minute(s) ago.`;
			if(joinSvHrs >= 1 && joinSvHrs <= 24) joinedSv = `Since ${joinSvMin} minute(s) ago,\n${joinSvHrs} hours ago.`;
			if(joinSvDay >= 1 && joinSvDay <= 30) joinedSv = `Since ${joinSvHrs} hours ago,\n${joinSvDay} day(s) ago.`;
			if(joinSvMonth >= 1 && joinSvMonth <= 12) joinedSv = `Since ${joinSvDay} day(s) ago,\n${joinSvMonth} month(s) ago.`;
			if(joinSvYear >= 1) joinedSv = `Since ${joinSvMonth} month(s) ago,\n${joinSvYear} year(s) ago.`;
			// let dateCreateAcc = moment.utc(user.createdAt).format("dddd, MMMM Do YYYY, HH:mm:ss");
			// let dateJoinSv = moment.utc(member.joinedAt).format("dddd, MMMM Do YYYY, HH:mm:ss");
			let embed_info = new MessageEmbed()
			.setTitle(`${user.tag.split('').slice(0,-5).join('')}'s Information`)
			.setThumbnail(user.displayAvatarURL({size:4096,dynamic:true}))
			.setTimestamp()
			.addFields(
				{ name:"👤 User:",value:user,inline:true },
				// { name:"ID:",value:`${id.toString()}`,inline:true },
				{ name:"Tag:",value:`${user.tag.split('').slice(-5).join('')}`,inline:true },
				{ name:"Status:",value:`${status}`,inline:true },
				{ name:"🎮 Activity:",value:actv,inline:true },
				// { name:"Server:",value:`${guild.name}`,inline:true },
				{ name:"🚩 Created Account At:",value:createdAcc,inline:true },
				{ name:"🎊 Joined Server At:",value:joinedSv,inline:true },
				// *** ERROR ***
				// { name:"Roles:",value:hasRole },
				// { name:"Permissions:",value:allPerms,inline:true },
			)
			if(id === '700565081422823464'){
				birthday = '18/05/2006';
				country = `${country[0]},\n${vn_province[0]}.`;
				favs = '🧮 Study Math\n⚽ Playing Soccer\n🪛 Vandalism,...';
				fav_col = '🟨 Yellow\n🟧 Orange\n🟥 Red';
				fav_game = '<:minecraft:768005258848239636> Minecraft\n⛏️ Đào Vàng';
				fav_film = 'Tom And Jerry,\nBalika Vadhu.';
				fav_anime = 'Dragon Ball';
			} else if(id === '673863035991097347'){
				birthday = '06/09/????';
				country = country[0];
				favs = '📺 Watching TV';
				fav_col = '⬛ Black\n⬜  White';
				fav_game = 'None';
				fav_film = 'Avengers';
				fav_anime = 'None';
			} else if(id === '682952580044947495'){
				birthday = '18/02/2006';
				country = `${country[0]},\n${vn_province[0]}.`;
				favs = '📚 Reading Books\n🎮 Playing Games';
				fav_col = '🟧 Orange\n⬜ White';
				fav_game = '<:halflife:768011806312103946> Half Life';
				fav_film='???';
				fav_anime='None';
			} else if(id === '664662418093506600'){
				birthday = '16/10/2005';
				country = `${country[0]},\n${vn_province[0]}.`;
				favs='🎧 Listening to Lofi and Rap';
				fav_col='🟧 Orange\n🟪 Purple';
				fav_game='<:rogue:768094835235880960> Soul Knight';
				fav_film='<:pokeball:768079192008032267> Pokemon';
				fav_anime='Your Name,\n<:onepiece:768077559048699904> One Piece.';
			// } else if(id === '674520531097354251'){
			// 	birthday = '19/05/1890';
			// 	country = country[0];
			} else {
				birthday='';country='';favs='';fav_col='';fav_game='';fav_film='';fav_anime='';
			}
			if(birthday!==''&&country!==''&&favs!==''&&fav_col!==''&&fav_game!==''&&fav_film!==''&&fav_anime!=='') embed_info.addFields(
					{ name:"🎂 Birthday:",value:birthday,inline:true },
					{ name:"🌐 Region:",value:country,inline:true },
					{ name:"Favourite Activity:",value:favs,inline:true },
					{ name:"Favourite Color:",value:fav_col,inline:true },
					{ name:"Favourite Games:",value:fav_game,inline:true },
					{ name:"Favourite Movies:",value:fav_film,inline:true },
					{ name:"Favourite Anime:",value:fav_anime,inline:true },
				);
			if(id === '677321866381099008'){
				embed_info.addFields(
					{ name:"Favourite Activity:",value:"💻 Programming",inline:true },
					{ name:"Favourite Programming Language:",value:"<:fuckingJS:767781465106153512> JavaScript",inline:true },
					{ name:"Favourite Anime:",value:"Nisekoi\nKanojo, Okarishimasu" },
					);
			}
			let userClientDev = await client.users.fetch('677321866381099008');
			let userClientIdea = await client.users.fetch('700565081422823464');
			if(id === '766337816367333386'){
				embed_info.addFields(
					{ name:"🔧 Bot Created By:",value:`${userClientDev.tag}`,inline:true },
					{ name:"💡 Bot Idea By:",value:`${userClientIdea.tag}`,inline:true },
					{ name:"❔ Usage:",value:"Info `@member`",inline:true },
					{ name:"🌐 Region:",value:"🇻🇳 Vietnam",inline:true },
					{ name:"🔗 Invite Link:",value:"[Invite Bot Here!](https://discord.com/api/oauth2/authorize?client_id=766337816367333386&permissions=8&scope=bot)",inline:true },
					);
			}
			message.channel.send(embed_info);
		}
		let snd_infocmdlength = message.content.split(' ').length <= 1;
		let snd_infocmdtype = message.content.toLowerCase().startsWith('info');
		if(snd_infocmdtype && snd_infocmdlength && message.content.split('').length === 4){
			message.channel.send('Please mention someone to get them information!');
		}
	}
	catch(info_failed){
		message.channel.send('Failed to get information. Please try again!');
		// message.channel.send(info_failed.message);
	}
});
client.login(process.env.BOT_TOKEN);
