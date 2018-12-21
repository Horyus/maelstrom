# maelstrom

🌊Crypto Data Aggregator

## Build Status

| Branch | Status |
| :----: | :----: |
| `master` | [![Build Status](https://travis-ci.org/Horyus/maelstrom.svg?branch=master)](https://travis-ci.org/Horyus/maelstrom) |
| `develop` | [![Build Status](https://travis-ci.org/Horyus/maelstrom.svg?branch=develop)](https://travis-ci.org/Horyus/maelstrom) |

## Extremely Fault Tolerant Data Aggregator

The main feature of maelstrom is its Fault Tolerance. Data is fetched for intervals of 5 mins and from APIs that allows historical data retrieval. Plugins are providing the informations, and are given lists of timestamps for fetch information for. Tables are dynamically created and merge fields provided by all plugins.

#### Table Example

| time | binance_open_price | binance_close_price | binance_low_price | binance_high_price | ... | gtrends_search |
| :--: | :----------------: | :-----------------: | :---------------: | :----------------: | :-: | :------------: |
| 2018-12-20 21:10:00 | 0.028387 | 0.028344 | 0.028534 | 0.028559 | ... | 262 |
| 2018-12-20 21:15:00 | 0.028387 | 0.028344 | 0.028534 | 0.028559 | ... |     |
| 2018-12-20 21:20:00 |          |          |          |          | ... | 300 |

Plugins are responsible of their fields (here we have two plugins, `binance` and `gtrends`). They can independently insert and create new rows. An Array stores all the "holes" for every table and every plugin. This Array is queried to get the fields that need to get fetched, and only on data reception, data is inserted in the database and removed from the Array. Starting the daemon will automatically add all holes to the Array and precisely resume fetching. A "hole" is a null value on a field that a plugin is responsible for, often occurs as APIs have very different response rates. Also, plugins have the ability to order the Teleporter class to connect to a random distant VPN (useful for public APIs that are EXTREMELY restrictive in request counts like Google Trend's).



