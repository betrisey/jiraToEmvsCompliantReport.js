var config = {
    login : {
        username: '',
        password: '',
        server: '___.atlassian.net',
        cloudconvertKey: '' // https://cloudconvert.com/
    },
    info : {
        firstname: '',
        lastname: '',
        company: '',
        stageInfo: '',
        companyResponsible: '',
        schoolResponsible: ''
    },
    recurringTasks : [
        {
            day: 1, // Monday
            title: '',
            description: '',
            duration: '1h00'
        },{
            day: 2, // Tuesday
            title: '',
            description: '',
            duration: '7h00'
        }
    ]
}

module.exports = config;