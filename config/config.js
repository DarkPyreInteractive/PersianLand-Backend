var config = {
  base: {
    port: "5000",
    url: "http://3.17.148.124", //"http://192.168.111.152", //"http://65.108.206.217",
  },
  origin: {
    port: "3000",
    url: "http://3.17.148.124", //"http://192.168.111.152", //"http://65.108.206.217",
  },
  database: {
    host: '127.0.0.1',
    port: 27017,
    db: 'perianland_db'
  }
};

module.exports = config;