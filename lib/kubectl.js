var spawn = require('child_process').spawn

function Kubectl(type, conf){
	this.type = type
	this.binary = conf.binary || 'kubectl'
	
	this.kubeconfig = conf.kubeconfig || ''
	this.endpoint = conf.endpoint || ''
}

Kubectl.prototype.spawn = function(args, done)
{
	var ops = new Array();

	// Prefer configuration file over endpoint if both are defined
	if (this.kubeconfig) {
		ops.push('--kubeconfig')
		ops.push(this.kubeconfig)
	} else {
		ops.push('-s')
		ops.push(this.endpoint)
	}

	var kube = spawn(this.binary, ops.concat(args))
		, stdout = ''
		, stderr = ''
	
	kube.stdout.on('data', function (data) {
	  	stdout += data
	})
	
	kube.stderr.on('data', function (data) {
	  	stderr += data
	})
	
	kube.on('close', function (code) {
		if( !stderr )
			stderr = undefined
			
		done(stderr, stdout)
	})
}

Kubectl.prototype.list = function(selector, done)
{
	if( !this.type )
		throw new Error('not a function')
	
	if( typeof selector === 'object'){
		var args = '--selector='
		
		for( var key in selector ){
			args += (key + '=' + selector[key])
		}
		
		selector = args + ''
	}
	else{
		done = selector
		selector = '--output=json'
	}
		
	this.spawn(['get', this.type , selector, '--output=json'], function(err, data){
		done(err, !err ? JSON.parse(data) : data)
	})
}

Kubectl.prototype.get = function(name, done)
{
	if( !this.type )
		throw new Error('not a function')
	
	this.spawn(['get', this.type, name, '--output=json'], function(err, data){
		done(err, !err ? JSON.parse(data) : data)
	})
}

Kubectl.prototype.create = function(filepath, done)
{
	if( !this.type )
		throw new Error('not a function')
		
	this.spawn(['create', '-f', filepath], function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.delete = function(id, done)
{
	if( !this.type )
		throw new Error('not a function')
		
	this.spawn(['delete', this.type, id], function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.update = function(filepath, done)
{
	if( !this.type )
		throw new Error('not a function')
	
	this.spawn(['update', '-f', filepath], function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.apply = function(name, json, done)
{
	if( !this.type )
		throw new Error('not a function')
	
	this.spawn(['update',  this.type, name, '--patch='+ JSON.stringify(json)], function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.rollingUpdateByFile = function(name, filepath, done)
{
	if( this.type !== 'rc' )
		throw new Error('not a function')
	
	this.spawn(['rolling-update',  name, '-f', filepath, '--update-period=0s'], function(err, data){
		done(err, data)
	})	
}

Kubectl.prototype.rollingUpdate = function(name, image, done)
{
	if( this.type !== 'rc' )
		throw new Error('not a function')
	
	this.spawn(['rolling-update',  name, '--image=' + image, '--update-period=0s'], function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.scale = function(name, replicas, done)
{
	if( this.type !== 'rc' )
		throw new Error('not a function')
	
	this.spawn(['scale', '--replicas=' + replicas, 'replicationcontrollers', name], function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.logs = function(name, done)
{
	if( this.type !== 'pods' )
		throw new Error('not a function')

	var action = new Array('logs');

	if (name.indexOf(' ') > -1) {
		var names = name.split(/ /);
		action.push(names[0]);
		action.push(names[1]);
	} else {
		action.push(name);
	}

	this.spawn(action, function(err, data){
		done(err, data)
	})
}

Kubectl.prototype.portForward = function(name, portString, done)
{
	if( this.type !== 'pods' )
		throw new Error('not a function')

	var action = new Array('port-forward', name, portString);

	return this.spawn(action, function(err, data){
		console.log(err);
		done(err, data)
	})
}

Kubectl.prototype.useContext = function(context, done){
	var action = new Array('config', 'use-context', context);
	return this.spawn(action, function(err, data){
		console.log(err);
		done(err, data)
	});
}

Kubectl.prototype.viewContext = function(done){
	var action = new Array('config', '--output=json', 'view');
	return this.spawn(action, function(err, data){
		console.log(err);
		done(err, !err ? JSON.parse(data) : data)
	});
}

// Kubectl.prototype.describe = function()
// {
// 	if( !this.type )
// 		throw new Error('not a function')
	
// 	this.spawn(['describe', '--replicas=' + replicas, 'replicationcontrollers', name], function(err, data){
// 		done(err, data)
// 	})	
// }



module.exports = function(conf)
{
	return {
		pod: new Kubectl('pods', conf)
		, rc: new Kubectl('rc', conf)
		, service: new Kubectl('service', conf)
		, node: new Kubectl('node', conf)
	}
}
