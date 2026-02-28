import { createMachine } from "xstate";

export const matchMachine = createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QFsCGAXAxgCwMQEkAlAYQH0ARfAZWIHkA5egUWIBUnyBtABgF1FQABwD2sAJboxwgHYCQAD0QAWAEwAaEAE9EANiUB2AHRKAnCu4mArCYMqdl-QF9HGtFmyGATgFdp0sdJQhgESYqgANmIAXgFQuBAyYMHSAG7CANZJbjhevv6ByaER0bEIAWmYGFLSPLy1ciLikjJyiggAHPoAjIZ2lkpKXe02lgDMXepaiPo63Ib6gyY6o-rcAyr6Ks6uGDk+frGFksUxgbhgnp7CnoaC4RgAZtfIhtke+-lBIceRp1BlqWElWaNT49SQIEaoRaELalms7UM7WsSlGs1Gli6lh0Gm0CHMcwWJhM3HaA029h0WxcIDeuQOBUwnjAVUCxGwqD8YHCsHiiWSaUyr127zyhyZLMkbI5XJ5AIqVRktXBQlE0NksMQXXGiLMXR0JiGI3Gkzx+gWhmJXRsowxJhWlm2tJF9M+hglrKg7M50m5vIuVxud0ez2F7ld4uZnu9stg8qBitBdT4DTVINaiGxpKRKLR3AxWJxU3x9vm3BUJk2gxUXQsSiddI+hwA7p6AGLXAAK900F2IMgeYk8bmqfN9AoyWRdTYKralUA7nm7qF7nn70kHw8T8eB1WVKYhUPTmoQQwGhjt41GSyUZNG7Vx02GvUWKlG3C6qLfDenYtn7a7Hs+wHIcRxkc5LmuW57nQJ5hzDPY-yCOdYkXZdV3XTcwOkHdE33fhDzTaoMwQbEhhzG10UxbFHwQe8dEMSl82WGYrHGH9wxnIIrnCcIxyScpJwQ0UGW44ReNwkF8NTJpiJPFQ30RVYdSowtTUQdp82MQ02LGa0Py6DjENErxxL4gMoODWDQ0bJDTIkwTdyVMED1VWSYVAOEqURZFKPzaiizxAwTEYixa3zQZ9CWEwjJEt00EEERxIAIU5fiJyFWyTISpLwlSnDHLwlyCLc9USL6JRjBWVFhj0O8H2LdouiMBZrVtIYdDJGKaSy+LUES4QUrSiygxguCXl6w4csGvLOUkvdipksqT2xe8KNRVSaOLBwVEMbEaz0d8dD0bgdFiiMClyqhuTATB0EgdLBMy38TKum67sgebnOTErISIjyFEQE0ehOzSmu4fpOoavF2nGS0dImMlmui86uNuGbrvCW77ogCDA2gkN4Mmy6MfenGvqTFU-vcjVPMzZYfNzTbAt0ew9qxBT2g2T8yXrHqXrdD17oAGWEAAjMXNAAQWkCAAHVUAkR7AWezi7KFsBRYl6XZYViQKekwiaZItEVERT9uAWVZlImSxaLJBiVEWVFL30R1+bVkyNa1yWZflxX0DxyyxpsgXI0lTXxd93WA4NxajeWunSIZ9a8wLLazUsRElE6isFLRUYzcMj3jLdCJwnQi5YAAKWEAIHoSccnqnT2y94yvPBruvfQgOOfqW48k+rOZbwGStLfzW37dmbTrTfD8v1GVG7PLjuu-r3GRoJ6yibDgpV6Azva43vuqaPOSk-2xm-PTlmOkxYwawxKkDO6bqdlbqb+tgfLlcFFvS5f0ED-OahUpLx1KoPQGCAlDwiMB+LOBoLZUjto1C0rVdLjBJF0YuH9AEFASiA6QQdRqEwmnvIIhD8qn1ctTRO0CyLXw2v5QstEbCVWqqoD8x0EFnRLnFIBsBOxiEwOkQgwh0CJj-kJYmlDv7CNEeIyRIIaG-XPgDOE5Zs5QxwSwjOiA9TGFJKYJqZsVDwmpHggRBD5EiLERIqRW8rLjWEhdORwCFH2OUdUVRA8L4MNmEwtOAVaK1hWBeDYo9tSkhRMvEyrZQiBDQofWAhAWQQE0NI1W+DkIB1QoBFcVc0moAyb4hOUDNFm2MDosJITiy1lMJaYxDgapYhwXEt0CT5zJMKZ3YpGSSHbxcbIwwXT8lLhSf0zQZTIH+LhAiVOzNQnRN6JpfomkrA2w6YcWIqBkBgCyQA6xXxAh7LADMuhFTlBwMMAg9oSClCnXMWwhSL4hjjBzlido9ztkFF2fswZzjQ6fz+ac-ZFz1G02gbAhwtyvkPKeagvEOCDSGC+deE6FYbDv2dJxW6MhfR3ViIc1xzJMAEuxqUMBC1+7lLmcoNmqg2rM2ecWY6owXwHW6P0Gw7RUb4q5ESs4TiQ67zxeSwV84IX-ShW0HOlhH7Mr0Sg+2PRTDEgNLeJ2NZvnOBpNIYQEA4ByDeH4jRiAAC0d8rW-KgGa2VuhRiVVHleG89VaIOA5aYGsp0cGVkNE4fhbijhhF+LEe1JFc7GDvNqN1NVaKbB6FaEwZI1g2CipY3FOT3RRnnDGX0PII0njCYiSeQxaouuhtMNEbylgrDWKoTYtrRkAQmb0zCoFExFqTlic08wlhNQxZWhNlgR46RdtYB0zaeLhG7dA8wsC0WsrNHoeYkVViqEOk7Zt00hpQsheVQYcw+idRZQm-QuodJjD0tg3BWbjno3EpjbGkA51tDNjMPa9omq1LUgm0sTs2oqS6s272Ucdb+wkG+oGTrKo6ETdaZBy6NKW1njMcsYwSRUmbQfXp68e7Qbot8kKk7iSDEeSqxqNY13WgnfaN2O7v75UI1+EKdodCIYo8hjoGJ4bNQ3XYL8fMrHBsIZ4pRXa6XmpgW7XalIXa1khiYe2XNGJZ0xGSfQtpLbCfvcGsZSSCmrlSekvEszpOWDNgqwsCmIY52U-UjDRiyQtPvG0u9Iz-lgBY2iBV-RVhZ0U-Z5Zrz8wViQdiW9zbsBiFgOgQjnUjAutjXVeNbKZ7EgUkXbBaxM2NgFYS+chHzEMSdfeTYE8TRIt0E7bSOqGNBtgN4TAmA4DwCkw6mB6kEDW3hjWSLXNVB5ZdA8RW4RvDMkI9YTqlpT3EdS0oZZtpQpmysN8p12o+HOCAA */
    id: "match",
    initial: "initializing",

    states: {
        initializing: {
            invoke: {
                src: "initMatch",
                onDone: { target: "creatingChannels" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        creatingChannels: {
            invoke: {
                src: "requestChannelCreation",
                onDone: { target: "watingForPlayerConfirmation" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        watingForPlayerConfirmation: {
            invoke: {
                src: "confirmPlayers",
                onDone: { target: "roll" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        roll: {
            invoke: {
                src: "makeRolls",
                onDone: { target: "mappoolBan" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        mappoolBan: {
            invoke: {
                src: "startMappoolsBan",
                onDone: { target: "poolSelected" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        poolSelected: {
            invoke: {
                src: "showSelectedPool",
                onDone: { target: "createLobbyAndWait" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        createLobbyAndWait: {
            invoke: {
                src: "createOsuLobbyAndWait",
                onDone: { target: "allPlayersJoined" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        allPlayersJoined: {
            invoke: {
                src: "allPlayersJoined",
                onDone: { target: "mapsBan" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        mapsBan: {
            invoke: {
                src: "startMapsBan",
                onDone: { target: "mapsPickRotation" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        mapsPickRotation: {
            invoke: {
                src: "startMapsPickRotatiton",
                onDone: { target: "waitingForPlayersReady" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        waitingForPlayersReady: {
            invoke: {
                src: "waitingForPlayersReady",
                onDone: { target: "ingame" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        ingame: {
            invoke: {
                src: "ingame",
                onDone: [
                    {
                        target: "finished",
                        guard: "isTeamWon",
                    },
                    {
                        target: "tbHype",
                        guard: "isTieBreaker",
                    },
                    {
                        target: "mapsPickRotation",
                        guard: () => true,
                    },
                ],
                onError: { target: "waitingForPlayersReady" },
            },
        },

        tbHype: {
            invoke: {
                src: "tbHype",
                onDone: { target: "waitingForPlayersReady" },
                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        finished: {
            invoke: {
                src: "finished",

                onError: {
                    target: "failure",
                    actions: "logError",
                },
            },
        },

        failure: {},
        success: {},
    },
});
