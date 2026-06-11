import { createContext, useEffect, useState, useContext } from "react";


const ThemeContext = createContext()

function ThemeProvider ({children}){

    const [tema, setTema] = useState(localStorage.getItem("tema") || "light")
    

    function toggleTema(){

        if(tema == "light")
            setTema("dark")

        if(tema == "dark")
            setTema("light")

    }

    useEffect(() =>{
        if(tema == 'dark'){
            document.documentElement.classList.add('dark')
            localStorage.setItem("tema", "dark")
        }
        if(tema == 'light'){
            document.documentElement.classList.remove('dark')
            localStorage.setItem("tema", "light")
        }
    }, [tema])

    return(
        <ThemeContext.Provider value = {{tema, toggleTema}}>
            {children}
        </ThemeContext.Provider>
    )

    
}
    function useTheme(){
        return useContext(ThemeContext)
    }

export {ThemeContext, ThemeProvider, useTheme}